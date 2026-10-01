"""会話単位の永続Pythonカーネル。"""
from __future__ import annotations

import pytest

from app import engine_adapter
from app.python_kernel import KernelError, PythonKernel


@pytest.fixture
def kernel(tmp_path):
    value = PythonKernel(tmp_path)
    yield value
    value.stop()


def test_state_and_last_expression_survive_between_cells(kernel):
    assert kernel.execute("values = [2, 3, 5]\nsum(values)") == "10"
    assert kernel.execute("values.append(7)\nvalues") == "[2, 3, 5, 7]"


def test_stdout_stderr_and_errors_are_returned_without_killing_kernel(kernel):
    events = []
    result = kernel.execute("print('hello')\n1 / 0", on_output=events.append)
    assert "hello" in result
    assert "ZeroDivisionError" in result
    assert any(e["type"] == "stdout" for e in events)
    assert any(e["type"] == "error" for e in events)
    assert kernel.execute("6 * 7") == "42"


def test_timeout_discards_stuck_kernel_and_next_cell_starts_clean(kernel):
    kernel.execute("marker = 123")
    with pytest.raises(KernelError, match="次の実行時に再起動"):
        kernel.execute("import time; time.sleep(2)", timeout=0.1)
    assert "NameError" in kernel.execute("marker")


def test_restart_clears_namespace(kernel):
    kernel.execute("marker = 123")
    kernel.restart()
    assert "NameError" in kernel.execute("marker")


def test_registered_tool_routes_to_active_conversation(tmp_path):
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)

    class Session:
        python_kernel = PythonKernel(tmp_path)
        events = []

        def _emit_event(self, event):
            self.events.append(event)

    session = Session()
    token = engine_adapter._ACTIVE_AGENT_SESSION.set(session)
    try:
        assert core.tools.execute_builtin_tool(
            "execute_python", {"code": "answer = 40 + 2\nanswer"}
        ) == "42"
        assert core.tools.execute_builtin_tool(
            "execute_python", {"code": "answer * 2"}
        ) == "84"
        assert any(e.get("category") == "python_output" for e in session.events)
    finally:
        engine_adapter._ACTIVE_AGENT_SESSION.reset(token)
        session.python_kernel.stop()


def test_python_execution_requires_existing_approval_flow(tmp_path):
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    session = engine_adapter.AgentSession(
        core, engine_adapter.config.active_server(), str(tmp_path)
    )
    try:
        assert "execute_python" in session._approval_required
        assert "restart_python_kernel" not in session._approval_required
    finally:
        session.close()


def test_cancel_running_cell_and_recover(kernel):
    from concurrent.futures import ThreadPoolExecutor
    import threading

    started = threading.Event()
    with ThreadPoolExecutor() as pool:
        running = pool.submit(kernel.execute, "print('ready', flush=True); import time; time.sleep(30)",
                              on_output=lambda event: started.set())
        assert started.wait(5)
        kernel.stop()
        with pytest.raises(KernelError):
            running.result(timeout=5)
    assert kernel.execute("6 * 7") == "42"


def test_close_prevents_recreation(kernel):
    kernel.execute("42")
    proc = kernel._process
    kernel.close()
    assert proc.poll() is not None
    assert proc.stdin.closed
    with pytest.raises(KernelError):
        kernel.execute("42")
    with pytest.raises(KernelError):
        kernel.restart()


def test_close_releases_workspace_directory(tmp_path):
    workspace = tmp_path / "kernel-workspace"
    workspace.mkdir()
    value = PythonKernel(workspace)
    try:
        assert value.execute("42") == "42"
    finally:
        value.close()
    workspace.rmdir()
    assert not workspace.exists()


def test_conversations_are_isolated(tmp_path):
    from concurrent.futures import ThreadPoolExecutor

    first = PythonKernel(tmp_path)
    second = PythonKernel(tmp_path)
    try:
        with ThreadPoolExecutor() as pool:
            a = pool.submit(first.execute, "marker = 'first'; marker")
            b = pool.submit(second.execute, "marker = 'second'; marker")
            assert a.result(timeout=5) == "'first'"
            assert b.result(timeout=5) == "'second'"
        first.close()
        assert second.execute("marker") == "'second'"
    finally:
        first.close()
        second.close()


def test_output_limit_stops_flood_and_recovers(kernel):
    with pytest.raises(KernelError, match="出力上限"):
        kernel.execute("while True: print('x' * 4096)")
    assert not kernel.alive
    assert kernel.execute("42") == "42"


def test_callback_failure_does_not_leak_events_into_next_cell(kernel):
    def fail(event):
        raise RuntimeError("disconnected")

    with pytest.raises(RuntimeError, match="disconnected"):
        kernel.execute("print('old'); 99", on_output=fail)
    assert kernel.execute("42") == "42"


def test_restart_interrupts_running_cell(kernel):
    from concurrent.futures import ThreadPoolExecutor
    import threading

    started = threading.Event()
    with ThreadPoolExecutor() as pool:
        running = pool.submit(kernel.execute, "print('ready'); import time; time.sleep(30)",
                              on_output=lambda event: started.set())
        assert started.wait(5)
        kernel.restart()
        with pytest.raises(KernelError):
            running.result(timeout=5)
    assert kernel.execute("42") == "42"


def test_cancelled_turn_cannot_start_kernel(kernel):
    with pytest.raises(KernelError):
        kernel.execute("42", cancelled=lambda: True)
    assert not kernel.alive
    assert kernel.execute("42", cancelled=lambda: False) == "42"


def test_registered_python_cell_obeys_turn_deadline_and_recovers(tmp_path, monkeypatch):
    import time

    from app.config import settings

    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    session = engine_adapter.AgentSession(
        core, {"base_url": "http://127.0.0.1:1", "model": "test"}, tmp_path
    )
    # Warm the kernel so this exercises stopping a running cell, with a later
    # file mutation proving that stopping the request also stops the work.
    session.python_kernel.execute("marker = 123")
    proc = session.python_kernel._process
    monkeypatch.setattr(settings, "turn_timeout_sec", 0.1)

    def runner(prompt, *, control, **kwargs):
        control.charge("llm_calls")
        return core.tools.execute_builtin_tool("execute_python", {"code":
            "import time\nfrom pathlib import Path\n"
            "time.sleep(1)\nPath('late.txt').write_text('must not happen')",
            "timeout": 5})

    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    events = []
    started = time.monotonic()
    try:
        session.run_turn("Pythonで確認", events.append)
        assert time.monotonic() - started < 2
        assert session.outcome == {"status": "limit_reached", "reason": "turn_timeout"}
        assert proc.poll() is not None
        assert not session.python_kernel.alive
        assert not (tmp_path / "late.txt").exists()
        assert any(event.get("text") == "turn_timeout" for event in events)
        assert session.python_kernel.execute("6 * 7") == "42"
        assert "NameError" in session.python_kernel.execute("marker")
    finally:
        session.close()


def test_cancel_callback_stops_running_cell_and_recovers(kernel):
    import threading

    cancelled = threading.Event()
    with pytest.raises(KernelError, match="停止"):
        kernel.execute("print('ready', flush=True)\nimport time; time.sleep(30)",
                       on_output=lambda event: cancelled.set(),
                       cancelled=cancelled.is_set)
    assert not kernel.alive
    assert kernel.execute("42") == "42"


def test_turn_expiring_during_startup_never_sends_cell(kernel, tmp_path, monkeypatch):
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    from unittest.mock import Mock

    expired = False
    worker = None
    send = None
    original_start = kernel._start

    class Control:
        def check(self):
            if expired:
                raise core.TurnStopped("turn_timeout")

    def expire_during_start():
        nonlocal expired, worker, send
        original_start()
        worker = kernel._process
        send = Mock(wraps=worker.stdin.write)
        monkeypatch.setattr(worker.stdin, "write", send)
        expired = True

    monkeypatch.setattr(kernel, "_start", expire_during_start)
    with pytest.raises(core.TurnStopped) as stopped:
        kernel.execute("from pathlib import Path; Path('unexpected.txt').write_text('bad')",
                       control=Control())
    assert stopped.value.reason == "turn_timeout"
    send.assert_not_called()
    assert worker.poll() is not None
    assert not kernel.alive
    assert not (tmp_path / "unexpected.txt").exists()
    monkeypatch.setattr(kernel, "_start", original_start)
    assert kernel.execute("42") == "42"


def test_session_drop_stops_kernel_and_prevents_recreation(tmp_path):
    from app.main import SessionManager

    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    session = engine_adapter.AgentSession(core, engine_adapter.config.active_server(), str(tmp_path))
    manager = SessionManager(core)
    manager._sessions["test"] = session
    try:
        session.python_kernel.execute("42")
        proc = session.python_kernel._process
        manager.drop("test")
        assert manager.get("test") is None
        assert proc.poll() is not None
        with pytest.raises(KernelError):
            session.python_kernel.execute("42")
    finally:
        session.close()


def test_lifespan_clears_sessions_on_shutdown(monkeypatch):
    import asyncio
    from unittest.mock import Mock
    from app import main

    manager = Mock()
    monkeypatch.setattr(main, "_startup", lambda: None)
    monkeypatch.setattr(main, "_manager", manager)

    async def run():
        async with main._lifespan(main.app):
            manager.clear.assert_not_called()
        manager.clear.assert_called_once()

    asyncio.run(run())
