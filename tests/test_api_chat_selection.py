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

from app import engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


class _FakeSession(engine_adapter.HistoryOps):
    def __init__(self):
        self.busy = threading.Lock()
        self.messages = []
        self.snapshots = []
        self.worksets = []
        self._init_turns()  # _turn_stream が往復を記録する（Engine 無しなので実質 no-op）

    def set_copilot(self, enabled):
        pass

    def set_workspace_snapshot(self, current_file, current_content, context_files=()):
        self.snapshots.append((current_file, current_content,
                               [(f.path, f.content) for f in context_files]))

    def build_workset(self, task, current_file, pinned_paths):
        self.worksets.append((task, current_file, pinned_paths))
        paths = ([current_file] if current_file else []) + [p for p in pinned_paths if p != current_file]
        return {"items": [{"path": p, "role": "target" if p == current_file else "pinned",
                            "lines": 1, "chars": 7, "buffer": True} for p in paths],
                "omitted": []}

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


def test_unsaved_current_buffer_is_passed_as_workspace_snapshot(sess):
    _post(current_file="src/a.py", current_content="UNSAVED = True\n")
    assert sess.snapshots == [("src/a.py", "UNSAVED = True\n", [])]
    # 本文をプロンプトへ重複投入せず、read_file の仮想バッファから必要時に読む。
    assert "UNSAVED = True" not in sess.messages[0]


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


# --- チェック済み参考ファイル（context_files）の Workset 化 ---

def test_checked_context_files_are_referenced_without_embedding(sess):
    _post(context_files=[{"path": "ref/one.py", "content": "AAA = 1"},
                         {"path": "ref/two.py", "content": "BBB = 2"}])
    sent = sess.messages[0]
    assert "Workset（選択・ピン留め済み）" in sent
    assert "`ref/one.py`" in sent and "AAA = 1" not in sent
    assert "`ref/two.py`" in sent and "BBB = 2" not in sent
    assert sess.snapshots[0][2] == [("ref/one.py", "AAA = 1"), ("ref/two.py", "BBB = 2")]
    assert sent.endswith("この関数を直して")  # 本題は末尾のまま


def test_current_file_not_duplicated_in_context_files(sess):
    """開いているファイルは未保存編集込みの方を優先し、context_files 側は重複させない。"""
    _post(current_file="src/a.py",
          context_files=[{"path": "src/a.py", "content": "OLD ON DISK"}])
    sent = sess.messages[0]
    assert "OLD ON DISK" not in sent
    assert sent.count("src/a.py") == 2  # 現在ファイル説明 + Workset の target


def test_context_files_do_not_consume_prompt_budget(sess, monkeypatch):
    big = "y" * 1000
    monkeypatch.setattr(main.settings, "context_char_budget", 1500)
    _post(context_files=[{"path": "a.py", "content": big},
                         {"path": "b.py", "content": big}])
    sent = sess.messages[0]
    assert "`a.py`" in sent and "`b.py`" in sent
    assert big not in sent


def test_workset_is_emitted_to_gui_before_agent_runs():
    class Session:
        def run_turn(self, message, emit, timeout):
            emit({"type": "token", "text": "answer"})

    events = []
    workset = {"items": [{"path": "a.py", "role": "target"}], "omitted": [], "stats": {}}
    main._run_code_with_workset(Session(), "task", workset, events.append)

    assert [event["type"] for event in events] == ["workset", "token"]
    assert events[0]["workset"] is workset


def test_context_setup_failure_releases_busy_lock(sess, monkeypatch):
    def reject(*_args, **_kwargs):
        raise ValueError("outside workspace")

    monkeypatch.setattr(sess, "set_workspace_snapshot", reject)
    response = client.post("/api/chat", json={
        "message": "x", "session_id": "s1", "current_file": "../outside.py"})
    assert response.status_code == 400
    assert "エディタ文脈が不正" in response.json()["detail"]
    assert sess.busy.acquire(blocking=False)  # 失敗ターンがロックを残していない
