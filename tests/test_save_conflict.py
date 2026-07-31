"""保存時の外部変更検知（mtime ガード）のテスト。

契約: `GET /api/file` が返した mtime を `POST /api/file` に付けて送ると、その間に
ディスクが変わっていた場合は **409 で書き込まない**。付けなければ従来どおり無条件
上書き（古いフロント互換）。`force=true` は衝突ダイアログで人が選んだ後の再送。
"""
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, main  # noqa: E402
from app.config import settings  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    monkeypatch.setattr(settings, "history_enabled", True)
    return tmp_path.resolve()


def _touch(p: Path, text: str) -> None:
    """mtime が確実に動くように書く（同一秒内の解像度差を吸収）。"""
    time.sleep(0.01)
    p.write_text(text, encoding="utf-8")
    st = p.stat()
    import os

    os.utime(p, (st.st_atime, st.st_mtime + 5))


def test_read_returns_mtime(workspace):
    (workspace / "a.md").write_text("hello", encoding="utf-8")
    r = client.get("/api/file", params={"path": "a.md"}).json()
    assert r["content"] == "hello"
    assert r["mtime"] == pytest.approx((workspace / "a.md").stat().st_mtime)


def test_save_with_matching_mtime_succeeds(workspace):
    (workspace / "a.md").write_text("hello", encoding="utf-8")
    got = client.get("/api/file", params={"path": "a.md"}).json()
    r = client.post("/api/file", json={"path": "a.md", "content": "edited",
                                       "base_mtime": got["mtime"]})
    assert r.status_code == 200
    assert r.json()["mtime"] > 0
    assert (workspace / "a.md").read_text(encoding="utf-8") == "edited"


def test_save_conflicts_when_changed_externally(workspace):
    (workspace / "a.md").write_text("hello", encoding="utf-8")
    got = client.get("/api/file", params={"path": "a.md"}).json()
    _touch(workspace / "a.md", "someone else wrote this")

    r = client.post("/api/file", json={"path": "a.md", "content": "my stale buffer",
                                       "base_mtime": got["mtime"]})
    assert r.status_code == 409
    # 書いていないこと（踏み潰しが起きていない）が本体
    assert (workspace / "a.md").read_text(encoding="utf-8") == "someone else wrote this"


def test_force_overwrites_after_conflict(workspace):
    (workspace / "a.md").write_text("hello", encoding="utf-8")
    got = client.get("/api/file", params={"path": "a.md"}).json()
    _touch(workspace / "a.md", "external")

    r = client.post("/api/file", json={"path": "a.md", "content": "mine",
                                       "base_mtime": got["mtime"], "force": True})
    assert r.status_code == 200
    assert (workspace / "a.md").read_text(encoding="utf-8") == "mine"
    # 踏み潰した「外部の内容」は履歴から救出できる
    from app import history

    contents = {history.read_version("a.md", v["id"]) for v in history.list_versions("a.md")}
    assert "external" in contents


def test_force_overwrite_snapshots_even_right_after_our_own_save(workspace):
    """直前に自分が保存していても、上書きで消える他人の変更は必ず履歴に残る。

    退避には「直近の世代が新しければ積まない」間引きがある（自動保存対策）。それが
    効いたままだと、保存 → 数秒後に外部が書き換え → 上書き、の順で**相手の変更だけが
    痕跡なく消える**。フロントは「履歴から戻せます」と言って上書きを選ばせているので、
    ここは間引きより案内の正しさを優先する。"""
    from app import history

    (workspace / "a.md").write_text("v1", encoding="utf-8")
    # 直前の保存で世代を1つ作る（この時点の履歴 = "v1"）
    client.post("/api/file", json={"path": "a.md", "content": "v2"})
    assert len(history.list_versions("a.md")) == 1

    got = client.get("/api/file", params={"path": "a.md"}).json()
    _touch(workspace / "a.md", "external edit")  # 間引き窓の内側で外部が書き換える

    conflict = client.post("/api/file", json={"path": "a.md", "content": "mine",
                                              "base_mtime": got["mtime"]})
    assert conflict.status_code == 409
    r = client.post("/api/file", json={"path": "a.md", "content": "mine",
                                       "base_mtime": got["mtime"], "force": True})
    assert r.status_code == 200
    contents = {history.read_version("a.md", v["id"]) for v in history.list_versions("a.md")}
    assert "external edit" in contents, "上書きで消えた他人の変更が履歴に残っていない"


def test_save_without_base_mtime_is_unconditional(workspace):
    (workspace / "a.md").write_text("hello", encoding="utf-8")
    _touch(workspace / "a.md", "external")
    r = client.post("/api/file", json={"path": "a.md", "content": "mine"})
    assert r.status_code == 200
    assert (workspace / "a.md").read_text(encoding="utf-8") == "mine"


def test_new_file_with_zero_mtime_is_allowed(workspace):
    r = client.post("/api/file", json={"path": "new.md", "content": "x", "base_mtime": 0.0})
    assert r.status_code == 200
    assert (workspace / "new.md").read_text(encoding="utf-8") == "x"


def test_new_file_conflicts_if_someone_created_it_first(workspace):
    (workspace / "new.md").write_text("created by someone else", encoding="utf-8")
    r = client.post("/api/file", json={"path": "new.md", "content": "mine", "base_mtime": 0.0})
    assert r.status_code == 409
    assert (workspace / "new.md").read_text(encoding="utf-8") == "created by someone else"
