import asyncio
import json
import threading
from pathlib import Path

import pytest

from app import engine_adapter, main
from app.config import settings


@pytest.fixture
def session(tmp_path):
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    value = engine_adapter.AgentSession(core, {"base_url": "http://127.0.0.1:1", "model": "test"}, str(tmp_path))
    yield value
    if value.busy.locked():
        value.release_turn()
    value.close()


def test_cancel_between_reservation_and_worker_start_is_not_reset(session, monkeypatch):
    from pixie_core import _api
    called = []
    monkeypatch.setattr(_api, "run_graph", lambda **kw: called.append(kw))
    assert session.reserve_turn()
    session.cancel()
    session.run_turn("must not execute", lambda _: None)
    assert called == []
    assert session.outcome["status"] == "cancelled"
    session.release_turn()
    assert session.reserve_turn()
    session.run_turn("next request", lambda _: None)
    assert len(called) == 1


def test_multiple_phases_share_one_llm_budget(session, monkeypatch):
    monkeypatch.setattr(settings, "turn_max_llm_calls", 1)
    assert session.reserve_turn()
    def run(*args, control, **kwargs):
        control.charge("llm_calls")
    monkeypatch.setattr(session._engine, "run_turn_events", run)
    session.run_turn("first phase", lambda _: None)
    session.run_turn("second phase", lambda _: None)
    assert session.outcome == {"status": "limit_reached", "reason": "llm_calls_limit"}
    assert session._control.snapshot()["llm_calls"] == 1


@pytest.mark.parametrize("switch_during_turn", [False, True])
def test_file_changes_follow_session_workspace(session, tmp_path, monkeypatch, switch_during_turn):
    original = Path(session.workspace)
    other = tmp_path.parent / (tmp_path.name + "_other")
    other.mkdir()
    monkeypatch.setattr(engine_adapter.config, "WORKSPACE", original if switch_during_turn else other)

    def run(*args, **kwargs):
        (original / "session.py").write_text("session change", encoding="utf-8")
        (other / "unrelated.py").write_text("other change", encoding="utf-8")
        monkeypatch.setattr(engine_adapter.config, "WORKSPACE", other)

    monkeypatch.setattr(session._engine, "run_turn_events", run)
    events = []
    session.run_turn("edit", events.append)
    changed = [event["paths"] for event in events if event["type"] == "files_changed"]
    assert changed == [["session.py"]]
    assert engine_adapter.config.WORKSPACE == other


def test_settings_change_does_not_change_active_turn(session, monkeypatch):
    monkeypatch.setattr(settings, "think_budget_sec", 90)
    monkeypatch.setattr(settings, "turn_max_llm_calls", 5)
    assert session.reserve_turn()
    first = session._control
    global_budget = session._core.get_think_budget()
    engine_adapter.apply_think_budget(300, [session])
    monkeypatch.setattr(settings, "turn_max_llm_calls", 10)
    assert first.limits.think_seconds == 90
    assert first.limits.llm_calls == 5
    assert session._core.get_think_budget() == global_budget
    session.release_turn()
    assert session.reserve_turn()
    assert session._control.limits.think_seconds == 300
    assert session._control.limits.llm_calls == 10


def test_server_read_idle_timeout_is_used_by_turn_control(session):
    session._read_idle_timeout = 120.0
    assert session.reserve_turn()
    assert session._control.limits.read_idle_timeout == 120.0


@pytest.mark.parametrize("kind", ["code", "note"])
def test_server_timeout_survives_session_creation_and_think_budget_updates(tmp_path, monkeypatch, kind):
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    server = {"base_url": "http://127.0.0.1:1", "model": "test",
              "overall_timeout": 600, "read_idle_timeout": 120}
    monkeypatch.setattr(settings, "think_budget_sec", 60)
    if kind == "code":
        value = engine_adapter.AgentSession(core, server, str(tmp_path))
    else:
        value = engine_adapter.NoteSession(core, server, str(tmp_path), False)
    try:
        assert value._engine.context.llm.overall_timeout == 600
        assert value._new_control().limits.stream_timeout == 600
        value.set_stream_timeout(engine_adapter.stream_timeout_sec(30))
        assert value._engine.context.llm.overall_timeout == 600
        assert value._engine.context.llm.read_idle_timeout == 120
        value.set_stream_timeout(engine_adapter.stream_timeout_sec(700))
        assert value._engine.context.llm.overall_timeout == 760
    finally:
        if kind == "code":
            value.close()


def test_approval_wait_obeys_turn_deadline(session, monkeypatch):
    from pixie_core import TurnStopped
    monkeypatch.setattr(settings, "turn_timeout_sec", 0.1)
    session._approval_timeout = None
    session._emit_event = lambda _: None
    assert session.reserve_turn()
    with pytest.raises(TurnStopped, match="turn_timeout"):
        session._approve([{"id": "call", "function": {"name": "execute_python", "arguments": '{"code":"42"}'}}], "")
    assert session._pending_id == 0


@pytest.mark.parametrize("result", ["completed", "failed", "cancelled", "limit_reached"])
def test_sse_done_carries_actual_outcome_and_releases_lock(result):
    class Session:
        busy = threading.Lock()
        outcome = {"status": result, "reason": "test"}
        def begin_turn(self, label): return 1
        def end_turn(self): pass
        def cancel(self): pass
    session = Session()
    session.busy.acquire()
    async def run():
        response = main._turn_stream(session, lambda emit: emit({"type": "token", "text": "partial"}))
        return [json.loads(chunk.removeprefix("data: ")) async for chunk in response.body_iterator]
    events = asyncio.run(run())
    assert events[-1]["status"] == result
    assert not session.busy.locked()


def test_cleanup_failure_still_reports_failure_and_releases_lock():
    class Session:
        busy = threading.Lock()
        def begin_turn(self, label): return 1
        def end_turn(self): raise RuntimeError("history failed")
        def cancel(self): pass
    session = Session()
    session.busy.acquire()
    async def run():
        response = main._turn_stream(session, lambda emit: None)
        return [json.loads(chunk.removeprefix("data: ")) async for chunk in response.body_iterator]
    events = asyncio.run(run())
    assert events[-1]["status"] == "failed"
    assert not session.busy.locked()


def test_interrupt_waits_for_committed_file_before_reporting_stopped(tmp_path, monkeypatch):
    from types import SimpleNamespace
    cancelled = threading.Event()
    busy = threading.Lock()
    busy.acquire()
    target = tmp_path / "committed.txt"
    session = SimpleNamespace(busy=busy, cancel=cancelled.set)
    monkeypatch.setattr(main, "_require_manager", lambda: SimpleNamespace(get=lambda sid: session))

    def worker():
        assert cancelled.wait(2)
        target.write_text("committed", encoding="utf-8")
        busy.release()

    thread = threading.Thread(target=worker)
    thread.start()
    try:
        assert main.api_interrupt(main.InterruptReq(session_id="test")) == {"ok": True, "stopped": True}
        assert target.read_text(encoding="utf-8") == "committed"
        assert not busy.locked()
    finally:
        thread.join(timeout=2)


def test_interrupt_reports_pending_when_worker_does_not_stop(monkeypatch):
    from types import SimpleNamespace
    from unittest.mock import Mock
    busy = Mock()
    busy.acquire.return_value = False
    session = SimpleNamespace(busy=busy, cancel=Mock())
    monkeypatch.setattr(main, "_require_manager", lambda: SimpleNamespace(get=lambda sid: session))
    assert main.api_interrupt(main.InterruptReq(session_id="test")) == {"ok": True, "stopped": False}
    session.cancel.assert_called_once()
    busy.acquire.assert_called_once_with(timeout=3.0)
    busy.release.assert_not_called()
