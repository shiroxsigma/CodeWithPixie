"""Code モードでも選択範囲がエージェントへ渡ることのテスト（Note と同じ機能を両モードで）。

エンジンは起動しないので、SessionManager と AgentSession をダミーに差し替えて
「run_turn に渡るメッセージ」だけを検証する。
"""
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


class _FakeSession:
    def __init__(self):
        self.busy = threading.Lock()
        self.messages = []

    def set_copilot(self, enabled):
        pass

    def run_turn(self, message, emit, timeout=0.0):
        self.messages.append(message)
        emit({"type": "token", "text": "ok"})


class _FakeManager:
    def __init__(self, sess):
        self._sess = sess

    def get_or_create(self, sid):
        return self._sess

    def get(self, sid):
        return self._sess


@pytest.fixture()
def sess(monkeypatch):
    s = _FakeSession()
    monkeypatch.setattr(main, "_manager", _FakeManager(s))
    monkeypatch.setattr(main.mode, "current_mode", lambda: "code")
    return s


def _post(**kw):
    body = {"message": "この関数を直して", "session_id": "s1"}
    body.update(kw)
    with client.stream("POST", "/api/chat", json=body) as r:
        assert r.status_code == 200
        for _ in r.iter_lines():
            pass


def test_selection_is_passed_to_agent(sess):
    _post(selection="def foo():\n    return 1", current_file="src/a.py")
    sent = sess.messages[0]
    assert "def foo():" in sent
    assert "選択中" in sent or "選択" in sent
    assert "src/a.py" in sent
    assert sent.endswith("この関数を直して")  # 本題は末尾（前置きに埋もれさせない）


def test_no_selection_keeps_message_unchanged(sess):
    _post()
    assert sess.messages[0] == "この関数を直して"


def test_long_selection_is_truncated(sess):
    _post(selection="x" * (main.SELECTION_MAX_CHARS + 500))
    sent = sess.messages[0]
    assert "以降を省略" in sent
    assert len(sent) < main.SELECTION_MAX_CHARS + 1000


def test_whitespace_only_selection_ignored(sess):
    _post(selection="   \n  ")
    assert sess.messages[0] == "この関数を直して"
