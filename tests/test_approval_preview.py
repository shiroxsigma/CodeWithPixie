"""承認時のChangeSetプレビュー（AWP公開APIへの委譲）と
「修正して承認」（/api/approve-edit）のテスト。

LLM は呼ばない。ツール呼び出しのChangeSet変換と、承認イベントに一括previewが
載ること、承認後にjournal適用へ委譲することを検証する。
"""
import json
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


# --- tool_calls → ChangeSet（同一pathは順序を保って集約） ---

def test_tool_calls_become_one_multi_file_changeset():
    calls = [
        _call("search_and_replace", {"path": "a.py", "search_block": "a", "replace_block": "b"}),
        _call("append_to_file", {"path": "a.py", "content": "tail"}),
        _call("replace_lines", {"path": "b.py", "start_line": 2, "end_line": 3,
                                "new_content": "new"}),
    ]
    result = engine_adapter._changeset_from_tool_calls(calls, "chg_test")
    assert result["id"] == "chg_test"
    assert [item["path"] for item in result["changes"]] == ["a.py", "b.py"]
    assert [op["kind"] for op in result["changes"][0]["operations"]] == [
        "search_replace", "append",
    ]


def test_mixed_command_batch_is_not_reordered_into_changeset():
    assert engine_adapter._changeset_from_tool_calls([
        _call("write_file", {"path": "a.py", "content": "x"}),
        _call("run_command", {"command": "pytest"}),
    ], "chg_test") is None


def test_markdown_semantic_tools_map_to_document_operations():
    result = engine_adapter._changeset_from_tool_calls([
        _call("replace_markdown_section", {"path": "a.md", "heading": "Intro", "content": "new"}),
        _call("update_markdown_frontmatter", {"path": "a.md", "values": {"title": "A"}}),
    ], "chg_docs")
    assert [op["kind"] for op in result["changes"][0]["operations"]] == [
        "replace_section", "update_frontmatter",
    ]


# --- _approve が承認イベントに preview を載せる ---

class _ApprovalHarness:
    """AgentSession._approve を単体で呼ぶ骨組み。承認待ちは極短タイムアウトで
    抜ける（タイムアウト→却下の経路）が、approval イベントはその前に発行済み。"""
    _approve = engine_adapter.AgentSession._approve
    _remember_changeset = engine_adapter.AgentSession._remember_changeset

    def __init__(self, required, approve=False):
        self._cancel = False
        self._approval_required = required
        self._approval_id = 0
        self._pending_id = 0
        self._approval_event = threading.Event()
        self._approval_timeout = 0.1
        self._approval_decision = None
        self.events = []
        self._emit_event = self.events.append
        self._engine = _FakeChangeEngine()
        self._changesets_by_turn = {}
        self._open_turn = {"id": 1}
        if approve:
            self._approval_event.set()


class _FakeChangeEngine:
    def __init__(self):
        self.applied = []

    def validate_changeset(self, spec):
        changes = [{"path": item["path"], "before": "before\n", "after": "after\n",
                    "base_hash": f"hash-{i}", "conflict": False}
                   for i, item in enumerate(spec["changes"])]
        return {"id": spec["id"], "ok": True, "changes": changes, "errors": [], "conflicts": []}

    def apply_changeset(self, spec):
        self.applied.append(spec)
        return {"id": spec["id"], "applied": True,
                "changes": [{"path": item["path"]} for item in spec["changes"]]}


def _call(name, args):
    return {"function": {"name": name, "arguments": json.dumps(args)}}


def test_approve_event_carries_changeset_preview(tmp_path):
    p = tmp_path / "t.py"
    h = _ApprovalHarness({"write_file"})
    h._approve([_call("write_file", {"path": str(p), "content": "after\n"})], "")
    ev = next(e for e in h.events if e["type"] == "approval")
    assert ev["calls"][0]["needs_approval"] is True
    assert ev["changeset"]["changes"][0]["before"] == "before\n"
    assert ev["changeset"]["changes"][0]["after"] == "after\n"


def test_approve_event_skips_preview_for_command():
    """run_command は差分のしようがない → preview なし（従来どおり引数表示で判断）。"""
    h = _ApprovalHarness({"run_command"})
    h._approve([_call("run_command", {"command": "dir"})], "")
    ev = next(e for e in h.events if e["type"] == "approval")
    assert "changeset" not in ev


def test_approved_file_batch_is_applied_once_as_changeset():
    h = _ApprovalHarness({"write_file"})
    # _approveがwaitへ入った後に相関ID付き承認を返す。
    def approve():
        while h._pending_id == 0:
            pass
        h._approval_decision = {"id": h._pending_id, "approve": True, "override": None}
        h._approval_event.set()
    thread = threading.Thread(target=approve)
    thread.start()
    approved, override = h._approve([
        _call("write_file", {"path": "a.py", "content": "a"}),
        _call("write_file", {"path": "b.py", "content": "b"}),
    ], "")
    thread.join()
    assert approved == []
    assert "一括適用" in override
    assert len(h._engine.applied) == 1
    assert [c["base_hash"] for c in h._engine.applied[0]["changes"]] == ["hash-0", "hash-1"]


# --- /api/approve-edit（修正して承認） ---

class _FakeEditSession:
    """resolve_approval を記録する偽セッション（workspace は tmp に束縛）。"""

    def __init__(self, workspace):
        self.workspace = workspace
        self.resolved = None

    def resolve_approval(self, approval_id, approve, override=None):
        self.resolved = (approval_id, approve, override)
        return True

    def apply_approval_edit(self, path, content):
        root = Path(self.workspace).resolve()
        target = Path(path)
        target = target.resolve() if target.is_absolute() else (root / target).resolve()
        if target != root and root not in target.parents:
            return {"applied": False, "error": "outside workspace"}
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {"applied": True, "changes": [{"path": target.relative_to(root).as_posix()}]}


def _patch_manager(monkeypatch, sess):
    class Mgr:
        def get(self, sid):
            return sess
    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())


def test_approve_edit_writes_file_and_overrides(tmp_path, monkeypatch):
    sess = _FakeEditSession(tmp_path)
    _patch_manager(monkeypatch, sess)
    target = tmp_path / "sub" / "a.py"
    r = client.post("/api/approve-edit", json={
        "id": 7, "session_id": "s1", "path": str(target), "content": "print(1)\n"})
    assert r.status_code == 200 and r.json()["ok"] is True
    assert target.read_text(encoding="utf-8") == "print(1)\n"  # 親フォルダごと作成
    aid, approve, override = sess.resolved
    assert aid == 7 and approve is False
    assert "ChangeSetで更新済み" in override and "sub/a.py" in override


def test_approve_edit_rejects_outside_workspace(tmp_path, monkeypatch):
    sess = _FakeEditSession(tmp_path)
    _patch_manager(monkeypatch, sess)
    outside = tmp_path.parent / "evil.py"
    r = client.post("/api/approve-edit", json={
        "id": 1, "session_id": "s1", "path": str(outside.resolve()), "content": "x"})
    assert r.status_code == 409
    assert not outside.exists()
    assert sess.resolved is None  # 書き込みも承認解決も起きていない


def test_approve_edit_unknown_session(monkeypatch):
    class Mgr:
        def get(self, sid):
            return None
    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    r = client.post("/api/approve-edit", json={
        "id": 1, "session_id": "s1", "path": "a.py", "content": "x"})
    assert r.status_code == 404
