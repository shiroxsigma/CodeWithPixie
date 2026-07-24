"""Code モード会話の永続化（app/code_chat.py サイドカー + /api/code-chat/*）のテスト。"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import code_chat, config, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    return tmp_path


def test_log_and_list(workspace):
    r = client.post("/api/code-chat/log", json={
        "session_id": "s-1", "user": "認証を作って", "assistant": "はい、計画は…"})
    assert r.status_code == 200

    r = client.get("/api/code-chat/sessions")
    sessions = r.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["session_id"] == "s-1"
    assert sessions[0]["title"] == "認証を作って"   # 最初のユーザー発言がタイトル
    assert sessions[0]["messages"] == 2

    # サイドカー実体
    assert (workspace / code_chat.SIDECAR_NAME).exists()


def test_log_appends_and_skips_empty(workspace):
    client.post("/api/code-chat/log", json={"session_id": "s-1", "user": "a", "assistant": "b"})
    client.post("/api/code-chat/log", json={"session_id": "s-1", "user": "c", "assistant": "d"})
    client.post("/api/code-chat/log", json={"session_id": "s-1", "user": "  ", "assistant": ""})
    msgs = client.get("/api/code-chat/session", params={"session_id": "s-1"}).json()["messages"]
    assert [m["content"] for m in msgs] == ["a", "b", "c", "d"]


def test_get_unknown_session_404(workspace):
    assert client.get("/api/code-chat/session", params={"session_id": "nope"}).status_code == 404


def test_delete(workspace):
    client.post("/api/code-chat/log", json={"session_id": "s-1", "user": "a", "assistant": "b"})
    assert client.post("/api/code-chat/delete", json={"session_id": "s-1"}).json()["ok"] is True
    assert client.get("/api/code-chat/sessions").json()["sessions"] == []
    # 2回目は「無かった」
    assert client.post("/api/code-chat/delete", json={"session_id": "s-1"}).json()["ok"] is False


def test_restore_seeds_engine(workspace, monkeypatch):
    """restore はセッションの history_replace を呼ぶ（文脈のシード）。"""
    client.post("/api/code-chat/log", json={"session_id": "s-9", "user": "q1", "assistant": "a1"})

    seen = {}

    class FakeSess:
        def replace_history(self, messages):
            seen["messages"] = messages
            return True

    class Mgr:
        def get_or_create(self, sid):
            seen["sid"] = sid
            return FakeSess()

    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    r = client.post("/api/code-chat/restore", json={"session_id": "s-9"})
    assert r.json()["ok"] is True
    assert seen["sid"] == "s-9"
    assert seen["messages"] == [
        {"role": "user", "content": "q1"}, {"role": "assistant", "content": "a1"}]


def test_restore_without_body_reads_sidecar(workspace, monkeypatch):
    """messages を省略するとサイドカーから読んでシードする。"""
    client.post("/api/code-chat/log", json={"session_id": "s-8", "user": "x", "assistant": "y"})
    seen = {}

    class FakeSess:
        def replace_history(self, messages):
            seen["messages"] = messages
            return True

    class Mgr:
        def get_or_create(self, sid):
            return FakeSess()

    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    r = client.post("/api/code-chat/restore", json={"session_id": "s-8"})
    assert r.json()["ok"] is True
    assert [m["content"] for m in seen["messages"]] == ["x", "y"]
