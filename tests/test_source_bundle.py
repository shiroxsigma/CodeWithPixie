"""Source snapshots preserve edits, prune private/generated data and stay bounded."""
import os
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import source_bundle  # noqa: E402


def _write(root: Path, relative: str, content: str = "included\n") -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content.encode("utf-8"))
    return path


def _skips(bundle: dict) -> dict[str, str]:
    return {item["path"]: item["reason"] for item in bundle["skipped"]}


def test_bundle_is_deterministic_and_counts_utf8_source(tmp_path):
    _write(tmp_path, "src/z.cs", "// 日本語\n")
    _write(tmp_path, "src/A.py", "print('hello')\n")
    _write(tmp_path, "Project.csproj", "<Project />\n")
    _write(tmp_path, "Project.sln", "Microsoft Visual Studio Solution\n")
    _write(tmp_path, "Dockerfile", "FROM python\n")
    first = source_bundle.build_bundle(str(tmp_path))
    assert first == source_bundle.build_bundle(tmp_path)
    assert first["root"] == str(tmp_path.resolve())
    assert first["filename"] == f"{tmp_path.name}-sources.md"
    assert first["file_count"] == 5
    assert first["total_bytes"] == sum(len(path.read_bytes()) for path in tmp_path.rglob("*")
                                       if path.is_file())
    assert first["truncated"] is False
    assert first["skipped"] == []
    positions = [first["content"].index(f"## {name}\n") for name in
                 ["Dockerfile", "Project.csproj", "Project.sln", "src/A.py", "src/z.cs"]]
    assert positions == sorted(positions)
    assert "// 日本語\n" in first["content"]


def test_prunes_dependencies_secrets_generated_and_nontext_before_read(tmp_path, monkeypatch):
    _write(tmp_path, "main.py", "SAFE\n")
    excluded = [
        "node_modules/pkg/index.js", ".venv/lib/a.py", ".git/HEAD",
        "obj/cache/a.cs", "bin/debug/a.json", "target/a.rs", "vendor/a.js",
        ".pixie_sessions/1/state.json", "secrets/production.json",
        ".env", ".env.local", ".env.example", ".token", "credentials.json",
        "service-account-prod.json", "private.key", "cert.pem",
        "package-lock.json", "Cargo.lock", "site.min.js", "Main.g.cs", "Form.Designer.cs",
        "previous-sources.md", "image.png",
    ]
    for relative in excluded:
        _write(tmp_path, relative, "MUST NOT SHARE\n")
    scanned = []
    original_scandir = source_bundle.os.scandir

    def scandir(path):
        scanned.append(Path(path).relative_to(tmp_path).as_posix())
        return original_scandir(path)

    read = []
    original_read = source_bundle.files.read_bytes_shared

    def read_bytes(path, limit=None):
        read.append(Path(path).relative_to(tmp_path).as_posix())
        return original_read(path, limit)

    monkeypatch.setattr(source_bundle.os, "scandir", scandir)
    monkeypatch.setattr(source_bundle.files, "read_bytes_shared", read_bytes)
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 1
    assert "MUST NOT SHARE" not in bundle["content"]
    assert read == ["main.py"]
    assert scanned == ["."]
    assert {"node_modules/", "secrets/", ".env", "credentials.json", "image.png"} <= _skips(bundle).keys()
    assert bundle["truncated"] is False


def test_project_config_and_workflows_are_kept_but_frontend_build_is_pruned(tmp_path):
    _write(tmp_path, ".github/workflows/check.yml", "steps: []\n")
    _write(tmp_path, "frontend/src/App.vue", "<template />\n")
    _write(tmp_path, "static/vue/assets/app.js", "BUILD OUTPUT\n")
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 2
    assert "## .github/workflows/check.yml" in bundle["content"]
    assert "## frontend/src/App.vue" in bundle["content"]
    assert "BUILD OUTPUT" not in bundle["content"]
    assert "static/vue/" in _skips(bundle)


def test_gitignore_hierarchy_anchors_globstar_and_negation(tmp_path):
    _write(tmp_path, ".gitignore", "/scratch/\n*.log\nconfig*.json\n!config.example.json\n"
           "src/**/*.skip.py\n/root-only.txt\n")
    _write(tmp_path, "src/.gitignore", "local.py\n!keep/local.py\n")
    excluded = ["scratch/private.py", "debug.log", "config.json", "src/a.skip.py",
                "src/nested/b.skip.py", "root-only.txt", "src/local.py"]
    included = ["main.py", "config.example.json", "src/keep/local.py", "src/root-only.txt"]
    for relative in excluded:
        _write(tmp_path, relative, "IGNORED VALUE\n")
    for relative in included:
        _write(tmp_path, relative, "PUBLIC VALUE\n")
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 6  # Two .gitignore files accompany the four sources.
    assert "IGNORED VALUE" not in bundle["content"]
    for relative in included:
        assert f"## {relative}\n" in bundle["content"]
    assert _skips(bundle)["scratch/"] == ".gitignore の対象"
    assert bundle["truncated"] is False


def test_markdown_fence_cannot_be_closed_by_file_content(tmp_path):
    content = "before\n```python\nprint(1)\n```\n````\n~~~~~\nafter\n"
    _write(tmp_path, "notes.md", content)
    result = source_bundle.build_bundle(tmp_path)["content"]
    assert "`````markdown\n" + content + "`````\n" in result


def test_long_backtick_run_uses_tildes_without_inflating_output(tmp_path):
    content = "`" * 10_000 + "\n"
    _write(tmp_path, "notes.md", content)
    result = source_bundle.build_bundle(tmp_path)["content"]
    assert "~~~markdown\n" + content + "~~~\n" in result
    assert len(result) < len(content) + 1_000


def test_binary_and_undecodable_text_are_skipped_but_bom_text_is_decoded(tmp_path):
    (tmp_path / "utf8.cs").write_bytes(b"\xef\xbb\xbf" + "// あ\n".encode("utf-8"))
    (tmp_path / "utf16.cs").write_bytes("// い\n".encode("utf-16"))
    (tmp_path / "binary.cs").write_bytes(b"fake\x00source")
    (tmp_path / "bad.py").write_bytes(b"\xff\xff")
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 2
    assert bundle["total_bytes"] == len("// あ\n// い\n".encode("utf-8"))
    assert "\ufeff" not in bundle["content"]
    assert _skips(bundle)["binary.cs"] == "バイナリファイル"
    assert "bad.py" in _skips(bundle)


def test_size_limit_includes_exact_boundary_and_skips_larger(tmp_path, monkeypatch):
    monkeypatch.setattr(source_bundle, "MAX_FILE_BYTES", 4)
    _write(tmp_path, "a.py", "1234")
    _write(tmp_path, "b.py", "12345")
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 1
    assert bundle["total_bytes"] == 4
    assert _skips(bundle)["b.py"] == "ファイルサイズの上限"
    assert bundle["truncated"] is True


def test_total_limit_skips_full_files_without_slicing_content(tmp_path, monkeypatch):
    monkeypatch.setattr(source_bundle, "MAX_TOTAL_BYTES", 7)
    for name in ["c.py", "a.py", "b.py"]:
        _write(tmp_path, name, "1234")
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 1
    assert bundle["total_bytes"] == 4
    assert "## a.py\n" in bundle["content"]
    assert _skips(bundle)["b.py"] == "合計サイズの上限"
    assert _skips(bundle)["c.py"] == "合計サイズの上限"
    assert bundle["truncated"] is True


def test_file_limit_and_bounded_skip_report(tmp_path, monkeypatch):
    monkeypatch.setattr(source_bundle, "MAX_FILES", 2)
    monkeypatch.setattr(source_bundle, "MAX_SKIPPED", 1)
    for index in range(6):
        _write(tmp_path, f"{index}.py")
    bundle = source_bundle.build_bundle(tmp_path)
    assert bundle["file_count"] == 2
    assert bundle["skipped"] == [{"path": "2.py", "reason": "ファイル数の上限"},
                                 {"path": "…", "reason": "ほか 3 件の除外"}]
    assert bundle["truncated"] is True


def test_scan_limit_bounds_enumeration_work(tmp_path, monkeypatch):
    _write(tmp_path, "a.py")
    _write(tmp_path, "b.py")
    for index in range(10):
        _write(tmp_path, f"{index}.py")
    original_scandir = source_bundle.os.scandir
    count = 0

    class ScandirCounter:
        def __init__(self, directory):
            self.iterator = original_scandir(directory)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            self.iterator.close()

        def __iter__(self):
            nonlocal count
            for entry in self.iterator:
                count += 1
                yield entry

    # All entries are sources; traversal inspects at most one extra entry to
    # detect that a directory exceeded its limit, independent of directory order.
    monkeypatch.setattr(source_bundle, "MAX_SCAN_ENTRIES", 2)
    monkeypatch.setattr(source_bundle.os, "scandir", ScandirCounter)
    bundle = source_bundle.build_bundle(tmp_path)
    assert count <= 3
    assert bundle["truncated"] is True
    assert "走査件数の上限" in _skips(bundle).values()


def test_unsaved_overlay_preserves_disk_and_uses_utf8_byte_count(tmp_path):
    original = _write(tmp_path, "src/a.py", "DISK VALUE\n")
    before = set(tmp_path.rglob("*"))
    bundle = source_bundle.build_bundle(tmp_path, current_file="src/a.py", current_content="# 未保存\n")
    assert "# 未保存\n" in bundle["content"]
    assert "DISK VALUE" not in bundle["content"]
    assert bundle["total_bytes"] == len("# 未保存\n".encode("utf-8"))
    assert "未保存の編集内容を反映" in bundle["content"]
    assert original.read_text(encoding="utf-8") == "DISK VALUE\n"
    assert set(tmp_path.rglob("*")) == before


@pytest.mark.skipif(os.name != "nt", reason="Windows paths are case-insensitive")
def test_unsaved_overlay_handles_windows_path_case(tmp_path):
    _write(tmp_path, "src/Main.py", "DISK VALUE")
    bundle = source_bundle.build_bundle(tmp_path, current_file="SRC/main.PY", current_content="EDIT VALUE")
    assert "EDIT VALUE" in bundle["content"]
    assert "DISK VALUE" not in bundle["content"]
    assert "未保存の編集内容を反映" in bundle["content"]


@pytest.mark.parametrize("relative", [".env", "secret.json", "node_modules/a.py", "ignored.py"])
def test_unsaved_overlay_cannot_bypass_exclusions(tmp_path, relative):
    _write(tmp_path, ".gitignore", "ignored.py\n")
    _write(tmp_path, "main.py", "safe")
    _write(tmp_path, relative, "private")
    bundle = source_bundle.build_bundle(tmp_path, current_file=relative, current_content="PRIVATE EDIT")
    assert "PRIVATE EDIT" not in bundle["content"]
    assert "未保存の編集内容を反映" not in bundle["content"]


def test_unsaved_overlay_rejects_external_paths_and_requires_a_file(tmp_path):
    _write(tmp_path, "main.py")
    for relative in ["../external.py", str(tmp_path.parent / "external.py")]:
        with pytest.raises(ValueError, match="対象プロジェクトの外"):
            source_bundle.build_bundle(tmp_path, current_file=relative, current_content="private")
    with pytest.raises(ValueError, match="パスが必要"):
        source_bundle.build_bundle(tmp_path, current_content="private")


def test_unsaved_overlay_is_subject_to_size_limit(tmp_path, monkeypatch):
    _write(tmp_path, "a.py", "original")
    _write(tmp_path, "b.py", "safe")
    monkeypatch.setattr(source_bundle, "MAX_FILE_BYTES", 5)
    bundle = source_bundle.build_bundle(tmp_path, current_file="a.py", current_content="123456")
    assert bundle["file_count"] == 1
    assert "123456" not in bundle["content"]
    assert bundle["truncated"] is True
    assert _skips(bundle)["a.py"] == "ファイルサイズの上限"


def test_external_symlinks_are_never_traversed_or_overlaid(tmp_path):
    project = tmp_path / "project"
    project.mkdir()
    _write(project, "main.py", "safe")
    external = _write(tmp_path, "external/private.py", "OUTSIDE CONTENT")
    try:
        (project / "linked.py").symlink_to(external)
        (project / "linked-dir").symlink_to(external.parent, target_is_directory=True)
    except OSError:
        pytest.skip("The platform does not permit symlink creation.")
    bundle = source_bundle.build_bundle(project)
    assert bundle["file_count"] == 1
    assert "OUTSIDE CONTENT" not in bundle["content"]
    assert {"linked.py", "linked-dir"} <= _skips(bundle).keys()
    with pytest.raises(ValueError, match="リンク"):
        source_bundle.build_bundle(project, current_file="linked-dir/private.py", current_content="bad")


@pytest.mark.skipif(os.name != "nt", reason="Windows junction behavior")
def test_windows_external_junctions_are_never_traversed(tmp_path):
    project = tmp_path / "project"
    project.mkdir()
    _write(project, "main.py", "safe")
    external = _write(tmp_path, "external/private.py", "OUTSIDE CONTENT")
    junction = project / "linked-dir"
    made = subprocess.run(["cmd.exe", "/c", "mklink", "/J", str(junction), str(external.parent)],
                          capture_output=True, check=False)
    if made.returncode:
        pytest.skip("Cannot create a Windows junction.")
    try:
        bundle = source_bundle.build_bundle(project)
        assert bundle["file_count"] == 1
        assert "OUTSIDE CONTENT" not in bundle["content"]
        assert _skips(bundle)["linked-dir"] == "シンボリックリンク・ジャンクション"
        with pytest.raises(ValueError, match="リンク"):
            source_bundle.build_bundle(project, current_file="linked-dir/private.py", current_content="bad")
    finally:
        junction.rmdir()


def test_empty_or_missing_project_has_clear_error(tmp_path):
    with pytest.raises(ValueError, match="ソースファイルがありません"):
        source_bundle.build_bundle(tmp_path)
    with pytest.raises(ValueError, match="フォルダが見つかりません"):
        source_bundle.build_bundle(tmp_path / "missing")


def test_filename_stays_within_attachment_limit(tmp_path):
    project = tmp_path / ("a" * 180)
    _write(project, "main.py")
    filename = source_bundle.build_bundle(project)["filename"]
    assert len(filename) <= 160
    assert filename.endswith("-sources.md")
