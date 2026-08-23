"""Note/Plan共通のWorkspaceSnapshot/Worksetチャット経路。"""
import json
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


class _FakeNoteSession(engine_adapter.HistoryOps):
    def __init__(self, workspace: Path):
        self.workspace = str(workspace)
        self.busy = threading.Lock()
        self.messages = []
        self.snapshots = []
        self.worksets = []
        self.seeded = True
        self._init_turns()

    def set_copilot(self, enabled):
        pass

    def set_workspace_snapshot(self, current_file, current_content, context_files=()):
        self.snapshots.append((current_file, current_content,
                               [(f.path, f.content) for f in context_files]))

    def build_workset(self, task, current_file, pinned_paths):
        self.worksets.append((task, current_file, pinned_paths))
        paths = ([current_file] if current_file else []) + [
            path for path in pinned_paths if path != current_file]
        return {"items": [{"path": path, "role": "target" if path == current_file else "pinned",
                            "lines": 1, "chars": 10, "buffer": True} for path in paths],
                "omitted": [], "stats": {"items": len(paths)}}

    def run_turn(self, user_text, emit):
        self.messages.append(user_text)
        emit({"type": "token", "text": "ok"})

    def cancel(self):
        pass


@pytest.fixture()
def note_session(tmp_path, monkeypatch):
    session = _FakeNoteSession(tmp_path)
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    monkeypatch.setattr(main, "_manager", object())
    monkeypatch.setattr(main.mode, "current_mode", lambda: "note")
    monkeypatch.setattr(main.engine_adapter, "get_note_session", lambda: session)
    return session


def _events(body):
    events = []
    with client.stream("POST", "/api/chat", json=body) as response:
        assert response.status_code == 200
        for line in response.iter_lines():
            if line.strip().startswith("data:"):
                events.append(json.loads(line.split(":", 1)[1].strip()))
    return events


def test_note_uses_workset_without_embedding_workspace_buffers(note_session, tmp_path):
    external = tmp_path.parent / "external.txt"
    events = _events({
        "message": "この仕様を整理して",
        "session_id": "s1",
        "current_file": "notes/spec.md",
        "current_content": "UNSAVED CURRENT\n",
        "context_files": [{"path": "notes/ref.md", "content": "PINNED BODY\n"}],
        "ref_texts": [{"path": str(external), "content": "EXTERNAL BODY\n"}],
    })

    assert [event["type"] for event in events] == ["workset", "token", "done"]
    sent = note_session.messages[0]
    assert "`notes/spec.md`" in sent and "`notes/ref.md`" in sent
    assert "UNSAVED CURRENT" not in sent and "PINNED BODY" not in sent
    assert "EXTERNAL BODY" in sent  # workspace外だけはsnapshotへ置けないため同梱
    assert sent.endswith("この仕様を整理して")
    assert note_session.snapshots == [
        ("notes/spec.md", "UNSAVED CURRENT\n", [("notes/ref.md", "PINNED BODY\n")])]
    assert note_session.worksets == [
        ("この仕様を整理して", "notes/spec.md", ["notes/ref.md"])]
