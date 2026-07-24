"""files.py のワークスペース走査（枝刈り・一覧上限・mtimeスナップショット）のテスト。

巨大ツリー（node_modules 等）を「走査時に」枝刈りすることと、一覧の件数上限が契約。
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, files, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    return tmp_path


def _mktree(ws: Path):
    (ws / "src").mkdir()
    (ws / "src" / "a.py").write_text("x = 1\n", encoding="utf-8")
    (ws / "README.md").write_text("# readme\n", encoding="utf-8")
    (ws / "logo.png").write_bytes(b"\x89PNG fake")
    # 無視ディレクトリの中身は走査されない（出力時除外ではなく走査時枝刈りが契約）
    (ws / "node_modules" / "pkg").mkdir(parents=True)
    (ws / "node_modules" / "pkg" / "index.js").write_text("js", encoding="utf-8")
    (ws / ".git" / "objects").mkdir(parents=True)
    (ws / ".git" / "HEAD").write_text("ref", encoding="utf-8")
    (ws / ".hidden_dir").mkdir()
    (ws / ".hidden_dir" / "s.txt").write_text("h", encoding="utf-8")


def test_list_files_prunes_ignored_dirs(workspace):
    _mktree(workspace)
    r = files.list_files()
    paths = {f["path"] for f in r["files"]}
    assert "src/a.py" in paths and "README.md" in paths and "logo.png" in paths
    assert not any(p.startswith("node_modules") for p in paths)
    assert not any(p.startswith(".git") for p in paths)
    assert not any(p.startswith(".hidden_dir") for p in paths)
    assert r["truncated"] is False
    # 型フラグ: png は非テキスト
    png = next(f for f in r["files"] if f["path"] == "logo.png")
    assert png["text"] is False and png["size"] > 0


def test_list_files_truncates_at_limit(workspace, monkeypatch):
    for i in range(6):
        (workspace / f"f{i}.txt").write_text(str(i), encoding="utf-8")
    monkeypatch.setattr(files, "MAX_LIST_ENTRIES", 4)
    r = files.list_files()
    assert len(r["files"]) == 4
    assert r["truncated"] is True


def test_api_files_shape(workspace):
    _mktree(workspace)
    r = client.get("/api/files").json()
    assert isinstance(r["files"], list)
    assert r["truncated"] is False
    assert r["root"] == str(workspace.resolve())


def test_snapshot_mtimes_prunes_ignored(workspace):
    _mktree(workspace)
    snap = files.snapshot_mtimes()
    assert "src/a.py" in snap and "README.md" in snap
    assert not any(k.startswith("node_modules") for k in snap)  # 変更検知も枝刈り済み走査
    assert "logo.png" not in snap  # テキストのみ


def test_iter_text_files_yields_paths(workspace):
    _mktree(workspace)
    got = {rel: p for rel, p in files.iter_text_files()}
    assert set(got) == {"src/a.py", "README.md"}
    assert got["src/a.py"].read_text(encoding="utf-8") == "x = 1\n"


# --- 遅延ツリー用: list_dir / /api/files/list（1階層だけ・非再帰） ---

def test_list_dir_root_is_nonrecursive(workspace):
    _mktree(workspace)
    r = files.list_dir("")
    paths = {f["path"] for f in r["files"]}
    # 直下だけ（src の中身は出ない）＋無視ディレクトリは姿ごと消える
    assert paths == {"src", "README.md", "logo.png"}
    assert r["truncated"] is False


def test_list_dir_subdir(workspace):
    _mktree(workspace)
    r = files.list_dir("src")
    assert [f["path"] for f in r["files"]] == ["src/a.py"]


def test_list_dir_bad_paths(workspace):
    _mktree(workspace)
    assert client.get("/api/files/list", params={"path": "../.."}).status_code == 400
    assert client.get("/api/files/list", params={"path": "nope"}).status_code == 400


def test_list_dir_truncates(workspace, monkeypatch):
    for i in range(5):
        (workspace / f"g{i}.txt").write_text(str(i), encoding="utf-8")
    monkeypatch.setattr(files, "MAX_DIR_ENTRIES", 3)
    r = files.list_dir("")
    assert len(r["files"]) == 3 and r["truncated"] is True


def test_api_files_list_returns_root(workspace):
    _mktree(workspace)
    r = client.get("/api/files/list").json()
    assert r["root"] == str(workspace.resolve())
    assert {f["path"] for f in r["files"]} == {"src", "README.md", "logo.png"}
