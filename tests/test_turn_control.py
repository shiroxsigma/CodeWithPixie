import asyncio
import json
import threading

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
