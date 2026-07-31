"""ローカル履歴（app/history.py）のテスト。

契約:
  - `files.write_file` が旧内容を .pixie_history/ へ退避する（UI 経由の保存・自動保存が全部通る）
  - 自動保存の連打で世代が食い潰されない（MIN_INTERVAL_SEC・内容一致のスキップ）
  - 古い世代は1日1世代に間引かれ、直近 KEEP_RECENT 世代は残る
  - 復元は「戻す直前の内容」も積むのでやり直せる
  - 履歴ディレクトリはツリーにも検索にも出ない
"""
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, files, history, main  # noqa: E402
from app.config import settings  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    monkeypatch.setattr(settings, "history_enabled", True)
    return tmp_path.resolve()


def _versions(ws: Path, rel: str) -> list[Path]:
    bucket = ws / history.DIR_NAME / rel
    return sorted(bucket.iterdir()) if bucket.is_dir() else []


# --- 退避される / されない ---------------------------------------------------

def test_write_file_snapshots_previous_content(workspace):
    files.write_file("a.md", "v1")
    assert _versions(workspace, "a.md") == []  # 新規作成には守る旧内容が無い

    files.write_file("a.md", "v2")
    saved = _versions(workspace, "a.md")
    assert len(saved) == 1
    assert saved[0].read_text(encoding="utf-8") == "v1"  # 上書き**前**の内容
    assert saved[0].suffix == ".md"  # 拡張子は元のまま（Explorer から開ける）
    assert (workspace / "a.md").read_text(encoding="utf-8") == "v2"


def test_nested_path_mirrors_directory_layout(workspace):
    (workspace / "docs").mkdir()
    files.write_file("docs/spec.md", "one")
    files.write_file("docs/spec.md", "two")
    bucket = workspace / history.DIR_NAME / "docs" / "spec.md"
    assert bucket.is_dir() and len(list(bucket.iterdir())) == 1


def test_identical_content_is_not_snapshotted(workspace):
    files.write_file("a.md", "v1")
    files.write_file("a.md", "v2")
    history.snapshot("a.md", now=datetime.now() + timedelta(seconds=999))
    # 直近世代(v1) と現在(v2) は違うので積まれる
    assert len(_versions(workspace, "a.md")) == 2
    # もう一度同じ状況で呼んでも、直近世代(v2)と現在(v2)が同一なので増えない
    history.snapshot("a.md", now=datetime.now() + timedelta(seconds=1998))
    assert len(_versions(workspace, "a.md")) == 2


def test_rapid_autosave_does_not_burn_history(workspace):
    """Note モードの自動保存は2秒間隔。連打で「編集前」が押し出されないこと。"""
    files.write_file("a.md", "original")
    for i in range(40):
        files.write_file("a.md", f"typing {i}")
    saved = _versions(workspace, "a.md")
    assert len(saved) == 1
    assert saved[0].read_text(encoding="utf-8") == "original"  # 編集を始める前が残る


def test_min_interval_allows_new_generation_after_gap(workspace):
    files.write_file("a.md", "v1")
    history.snapshot("a.md")  # v1 を退避
    later = datetime.now() + timedelta(seconds=history.MIN_INTERVAL_SEC + 5)
    (workspace / "a.md").write_text("v2", encoding="utf-8")
    history.snapshot("a.md", now=later)
    assert len(_versions(workspace, "a.md")) == 2


def test_disabled_by_setting(workspace, monkeypatch):
    monkeypatch.setattr(settings, "history_enabled", False)
    files.write_file("a.md", "v1")
    files.write_file("a.md", "v2")
    assert _versions(workspace, "a.md") == []


def test_oversized_file_is_skipped(workspace, monkeypatch):
    monkeypatch.setattr(history, "MAX_SNAPSHOT_BYTES", 4)
    files.write_file("a.md", "longer than four")
    files.write_file("a.md", "next")
    assert _versions(workspace, "a.md") == []


def test_snapshot_never_raises_on_bad_path(workspace):
    assert history.snapshot("../outside.md") is None


# --- 間引き -------------------------------------------------------------------

def _seed(ws: Path, rel: str, stamps: list[str]) -> Path:
    bucket = ws / history.DIR_NAME / rel
    bucket.mkdir(parents=True, exist_ok=True)
    for s in stamps:
        (bucket / f"{s}.md").write_text(s, encoding="utf-8")
    return bucket


def test_prune_keeps_recent_and_thins_old_to_one_per_day(workspace, monkeypatch):
    monkeypatch.setattr(history, "KEEP_RECENT", 3)
    monkeypatch.setattr(history, "MAX_TOTAL", 100)
    stamps = [
        "20260731-100000-000", "20260731-100100-000", "20260731-100200-000",  # 直近3
        "20260730-090000-000", "20260730-093000-000", "20260730-095900-000",  # 前日3 → 1
        "20260729-090000-000", "20260729-093000-000",                          # 前々日2 → 1
    ]
    bucket = _seed(workspace, "a.md", stamps)
    history._prune(bucket)
    left = sorted(p.stem for p in bucket.iterdir())
    assert left == [
        "20260729-093000-000",   # その日の最新だけ
        "20260730-095900-000",
        "20260731-100000-000", "20260731-100100-000", "20260731-100200-000",
    ]


def test_prune_hard_cap(workspace, monkeypatch):
    monkeypatch.setattr(history, "KEEP_RECENT", 10)
    monkeypatch.setattr(history, "MAX_TOTAL", 4)
    bucket = _seed(workspace, "a.md", [f"20260731-1000{i:02d}-000" for i in range(10)])
    history._prune(bucket)
    left = sorted(p.stem for p in bucket.iterdir())
    assert left == ["20260731-100006-000", "20260731-100007-000",
                    "20260731-100008-000", "20260731-100009-000"]  # 新しい方を残す


# --- 一覧 / 読み出し / 復元 ---------------------------------------------------

def test_list_read_and_restore(workspace):
    files.write_file("a.md", "v1")
    files.write_file("a.md", "v2")
    versions = history.list_versions("a.md")
    assert len(versions) == 1
    v = versions[0]
    assert history.STAMP_RE.match(v["id"]) and v["size"] == 2 and v["saved_at"]

    assert history.read_version("a.md", v["id"]) == "v1"
    assert history.restore("a.md", v["id"]) == "v1"
    assert (workspace / "a.md").read_text(encoding="utf-8") == "v1"
    # 復元自体もやり直せる: 戻す直前の v2 が積まれている
    contents = {p.read_text(encoding="utf-8") for p in _versions(workspace, "a.md")}
    assert contents == {"v1", "v2"}


def test_read_version_rejects_unknown_and_malformed(workspace):
    files.write_file("a.md", "v1")
    files.write_file("a.md", "v2")
    with pytest.raises(ValueError):
        history.read_version("a.md", "../../etc/passwd")
    with pytest.raises(FileNotFoundError):
        history.read_version("a.md", "20200101-000000-000")


# --- API ----------------------------------------------------------------------

def test_history_api_roundtrip(workspace):
    files.write_file("a.md", "v1")
    files.write_file("a.md", "v2")
    listed = client.get("/api/history", params={"path": "a.md"}).json()
    assert listed["enabled"] is True and len(listed["versions"]) == 1
    vid = listed["versions"][0]["id"]

    got = client.get("/api/history/file", params={"path": "a.md", "version_id": vid}).json()
    assert got["content"] == "v1"

    r = client.post("/api/history/restore", json={"path": "a.md", "version_id": vid}).json()
    assert r["ok"] is True and r["content"] == "v1" and r["mtime"] > 0
    assert (workspace / "a.md").read_text(encoding="utf-8") == "v1"


def test_history_api_errors(workspace):
    assert client.get("/api/history", params={"path": "../x"}).status_code == 400
    assert client.get("/api/history/file",
                      params={"path": "a.md", "version_id": "nope"}).status_code == 400
    assert client.post("/api/history/restore",
                       json={"path": "a.md", "version_id": "20200101-000000-000"}
                       ).status_code == 404


# --- 履歴ディレクトリは表に出ない ---------------------------------------------

def test_history_dir_is_hidden_from_tree_and_walk(workspace):
    files.write_file("a.md", "v1")
    files.write_file("a.md", "v2")
    assert _versions(workspace, "a.md")  # 履歴は確かに在る

    paths = {f["path"] for f in files.list_files()["files"]}
    assert not any(p.startswith(history.DIR_NAME) for p in paths)
    top = {f["path"] for f in files.list_dir("")["files"]}
    assert history.DIR_NAME not in top
    assert not any(rel.startswith(history.DIR_NAME) for rel, _ in files.iter_text_files())
    assert history.DIR_NAME in files.IGNORE_DIRS  # 検索（rg グロブ / rglob）からも除外
