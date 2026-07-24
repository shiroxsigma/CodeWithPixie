"""承認時の差分プレビュー（engine_adapter._tool_preview / _approve の preview 付与）と
「修正して承認」（/api/approve-edit）のテスト。

_llM は呼ばない。_tool_preview は tmp_path の実ファイルに対して純粋計算し、
_approve は承認待ちを極短タイムアウトで抜けるハーネスで「イベントに preview が
載ること」だけを検証する。
"""
import json
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


# --- _tool_preview（書き込み系3ツールの前後計算） ---

def test_write_file_existing(tmp_path):
    p = tmp_path / "a.py"
    p.write_text("old = 1\n", encoding="utf-8")
    pv = engine_adapter._tool_preview("write_file", {"path": str(p), "content": "new = 2\n"})
    assert pv == {"path": str(p), "before": "old = 1\n", "after": "new = 2\n"}


def test_write_file_new_file(tmp_path):
    p = tmp_path / "new.py"
    pv = engine_adapter._tool_preview("write_file", {"path": str(p), "content": "x = 1\n"})
    assert pv["before"] == ""        # 未存在は空（新規作成として差分表示できる）
    assert pv["after"] == "x = 1\n"


def test_write_file_binary_target_skipped(tmp_path):
    p = tmp_path / "b.bin"
    p.write_bytes(b"\x00\xff\x00\xff\x80\x81")
    assert engine_adapter._tool_preview("write_file", {"path": str(p), "content": "x"}) is None


def test_search_and_replace_applied(tmp_path):
    p = tmp_path / "s.py"
    p.write_text("alpha\nbeta\ngamma\n", encoding="utf-8")
    pv = engine_adapter._tool_preview(
        "search_and_replace",
        {"path": str(p), "search_block": "beta", "replace_block": "BETA"})
    assert pv["after"] == "alpha\nBETA\ngamma\n"
    assert pv["before"] == "alpha\nbeta\ngamma\n"


def test_search_and_replace_no_match_returns_none(tmp_path):
    """マッチしない提案はツール側も失敗するので、紛らわしい差分を出さない。"""
    p = tmp_path / "s.py"
    p.write_text("alpha\n", encoding="utf-8")
    pv = engine_adapter._tool_preview(
        "search_and_replace",
        {"path": str(p), "search_block": "nope", "replace_block": "x"})
    assert pv is None


def test_replace_lines_middle(tmp_path):
    p = tmp_path / "r.py"
    p.write_text("l1\nl2\nl3\nl4\n", encoding="utf-8")
    pv = engine_adapter._tool_preview(
        "replace_lines",
        {"path": str(p), "start_line": 2, "end_line": 3, "new_content": "L2-3"})
    assert pv["after"] == "l1\nL2-3\nl4\n"   # 1オリジン・両端含む（AWP と同一セマンティクス）


def test_replace_lines_end_clamped(tmp_path):
    p = tmp_path / "r.py"
    p.write_text("l1\nl2\n", encoding="utf-8")
    pv = engine_adapter._tool_preview(
        "replace_lines",
        {"path": str(p), "start_line": 2, "end_line": 99, "new_content": "tail"})
    assert pv["after"] == "l1\ntail\n"


def test_replace_lines_out_of_range_returns_none(tmp_path):
    p = tmp_path / "r.py"
    p.write_text("l1\n", encoding="utf-8")
    assert engine_adapter._tool_preview(
        "replace_lines",
        {"path": str(p), "start_line": 5, "end_line": 6, "new_content": "x"}) is None


def test_unsupported_tools_return_none():
    assert engine_adapter._tool_preview("run_command", {"command": "dir"}) is None
    assert engine_adapter._tool_preview("make_directory", {"path": "d"}) is None
    assert engine_adapter._tool_preview("write_file", {"path": ""}) is None  # 不正な引数


# --- _approve が承認イベントに preview を載せる ---

class _ApprovalHarness:
    """AgentSession._approve を単体で呼ぶ骨組み。承認待ちは極短タイムアウトで
    抜ける（タイムアウト→却下の経路）が、approval イベントはその前に発行済み。"""
    _approve = engine_adapter.AgentSession._approve

    def __init__(self, required):
        self._cancel = False
        self._approval_required = required
        self._approval_id = 0
        self._pending_id = 0
        self._approval_event = threading.Event()
        self._approval_timeout = 0.01
        self._approval_decision = None
        self.events = []
        self._emit_event = self.events.append


def _call(name, args):
    return {"function": {"name": name, "arguments": json.dumps(args)}}


def test_approve_event_carries_preview(tmp_path):
    p = tmp_path / "t.py"
    p.write_text("before\n", encoding="utf-8")
    h = _ApprovalHarness({"write_file"})
    h._approve([_call("write_file", {"path": str(p), "content": "after\n"})], "")
    ev = next(e for e in h.events if e["type"] == "approval")
    assert ev["calls"][0]["needs_approval"] is True
    assert ev["calls"][0]["preview"] == {"path": str(p), "before": "before\n", "after": "after\n"}


def test_approve_event_skips_preview_for_command():
    """run_command は差分のしようがない → preview なし（従来どおり引数表示で判断）。"""
    h = _ApprovalHarness({"run_command"})
    h._approve([_call("run_command", {"command": "dir"})], "")
    ev = next(e for e in h.events if e["type"] == "approval")
    assert "preview" not in ev["calls"][0]


# --- /api/approve-edit（修正して承認） ---

class _FakeEditSession:
    """resolve_approval を記録する偽セッション（workspace は tmp に束縛）。"""

    def __init__(self, workspace):
        self.workspace = workspace
        self.resolved = None

    def resolve_approval(self, approval_id, approve, override=None):
        self.resolved = (approval_id, approve, override)
        return True


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
    assert "更新済み" in override and "sub/a.py" in override  # 完了案内が相対パスで入る


def test_approve_edit_rejects_outside_workspace(tmp_path, monkeypatch):
    sess = _FakeEditSession(tmp_path)
    _patch_manager(monkeypatch, sess)
    outside = tmp_path.parent / "evil.py"
    r = client.post("/api/approve-edit", json={
        "id": 1, "session_id": "s1", "path": str(outside.resolve()), "content": "x"})
    assert r.status_code == 400
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
