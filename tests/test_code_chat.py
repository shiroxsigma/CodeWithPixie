"""Code モード会話の永続化（app/code_chat.py サイドカー + /api/code-chat/*）のテスト。"""
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
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


@pytest.mark.parametrize("second_action", ["log", "delete"])
def test_concurrent_updates_preserve_both_changes(workspace, monkeypatch, second_action):
    code_chat.code_chat_log(code_chat.LogReq(session_id="old", user="original"))
    saving = threading.Event()
    resume = threading.Event()
    second_started = threading.Event()
    second_loaded = threading.Event()
    original_save = code_chat._save_store
    original_load = code_chat.load_store

    def paused_save(data, path=None):
        if not saving.is_set():
            saving.set()
            assert resume.wait(5), "test did not release the first writer"
        original_save(data, path)

    def observed_load(path=None):
        data = original_load(path)
        if second_started.is_set():
            second_loaded.set()
        return data

    def second_update():
        second_started.set()
        if second_action == "log":
            return code_chat.code_chat_log(code_chat.LogReq(session_id="second", user="two"))
        return code_chat.code_chat_delete(code_chat.DeleteReq(session_id="old"))

    monkeypatch.setattr(code_chat, "_save_store", paused_save)
    monkeypatch.setattr(code_chat, "load_store", observed_load)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(code_chat.code_chat_log, code_chat.LogReq(session_id="first", user="one"))
        try:
            assert saving.wait(5)
            second = pool.submit(second_update)
            assert second_started.wait(5)
            # 先行更新が未確定の間、後続要求は古いJSONを読めない。
            assert not second_loaded.wait(0.1)
        finally:
            resume.set()
        assert first.result(timeout=5) == {"ok": True}
        assert second.result(timeout=5) == {"ok": True}

    data = original_load()
    assert data["first"]["messages"] == [{"role": "user", "content": "one"}]
    if second_action == "log":
        assert set(data) == {"old", "first", "second"}
        assert data["second"]["messages"] == [{"role": "user", "content": "two"}]
    else:
        assert set(data) == {"first"}


@pytest.mark.parametrize("failure_stage", ["write", "replace"])
def test_failed_save_preserves_original_and_cleans_temporary(workspace, monkeypatch, failure_stage):
    code_chat.code_chat_log(code_chat.LogReq(session_id="old", user="保存済み"))
    path = workspace / code_chat.SIDECAR_NAME
    original_bytes = path.read_bytes()

    if failure_stage == "write":
        original_temporary = code_chat.tempfile.NamedTemporaryFile

        def broken_temporary(*args, **kwargs):
            stream = original_temporary(*args, **kwargs)
            original_write = stream.write

            def partial_write(payload):
                original_write(payload[:10])
                raise OSError("simulated disk write failure")

            stream.write = partial_write
            return stream

        monkeypatch.setattr(code_chat.tempfile, "NamedTemporaryFile", broken_temporary)
    else:
        def failed_replace(source, destination):
            raise OSError("simulated replace failure")

        monkeypatch.setattr(code_chat.os, "replace", failed_replace)

    with pytest.raises(OSError, match="simulated"):
        code_chat.code_chat_log(code_chat.LogReq(session_id="new", user="追加"))

    assert path.read_bytes() == original_bytes
    assert set(code_chat.load_store()) == {"old"}
    assert list(workspace.iterdir()) == [path]


@pytest.mark.parametrize("action", ["log", "delete"])
def test_update_keeps_entry_workspace_after_switch(workspace, monkeypatch, action):
    code_chat.code_chat_log(code_chat.LogReq(session_id="old", user="original"))
    other_workspace = workspace / "other"
    other_workspace.mkdir()
    original_load = code_chat.load_store

    def switching_load(path=None):
        data = original_load(path)
        monkeypatch.setattr(config, "WORKSPACE", other_workspace)
        return data

    monkeypatch.setattr(code_chat, "load_store", switching_load)
    if action == "log":
        code_chat.code_chat_log(code_chat.LogReq(session_id="new", user="new"))
    else:
        code_chat.code_chat_delete(code_chat.DeleteReq(session_id="old"))

    data = original_load(workspace / code_chat.SIDECAR_NAME)
    assert set(data) == ({"old", "new"} if action == "log" else set())
    assert not (other_workspace / code_chat.SIDECAR_NAME).exists()
