"""Exercise automatic edits and actual failing/passing commands together."""
import json
from pathlib import Path
import sys

import pytest

from app import engine_adapter
from app.autonomy import AutonomousRun
from app.config import settings


def call(name, **args):
    return {"id": name, "type": "function", "function": {
        "name": name, "arguments": json.dumps(args)}}


@pytest.fixture
def session(tmp_path):
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    value = engine_adapter.AgentSession(core, {"base_url": "http://127.0.0.1:1", "model": "test"}, tmp_path)
    value.bind_memory("autonomous-test")
    yield value
    value.close()


def finish(event_fn):
    event_fn({"type": "turn_completed", "metrics": {
        "exit_reason": "final_answer", "llm_calls": [], "tool_calls": 0}})
    return "完了しました。"


def command_for_tests():
    prefix = "& " if sys.platform == "win32" else ""
    return f"{prefix}'{sys.executable}' -m unittest -q"


def test_autonomous_edit_failed_test_repair_and_real_retest(session, monkeypatch):
    from pixie_core.registry import TOOL_REGISTRY
    root = Path(session.workspace)
    (root / "calc.py").write_text("def value():\n    return 0\n", encoding="utf-8")
    (root / "test_calc.py").write_text(
        "import unittest\nfrom calc import value\n"
        "class TestValue(unittest.TestCase):\n"
        "    def test_value(self):\n        self.assertEqual(value(), 2)\n", encoding="utf-8")
    command = command_for_tests()
    session.configure_autonomy(True, command)
    attempts = []

    def runner(prompt, *, event_fn, interactive_fn, control, **kwargs):
        control.charge("llm_calls")
        attempts.append(prompt)
        value = 10 if len(attempts) == 1 else 2
        approved, override = interactive_fn([
            call("write_file", path="calc.py", content=f"def value():\n    return {value}\n")], "edit")
        assert not approved and "ChangeSet" in override
        approved, override = interactive_fn([call("run_command", command=command)], "test")
        assert approved and override is None
        output = TOOL_REGISTRY["run_command"]["func"](command)
        if value == 10:
            assert output.startswith("Error")
        else:
            assert "OK" in output
        return finish(event_fn)

    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    events = []
    session.begin_turn("fix calc; do not edit tests")
    session.prepare_turn_snapshot(1)
    session.run_turn("calc.pyを直して検証。test_calc.pyは変更しない。", events.append)
    session.end_turn()
    assert len(attempts) == 2
    assert session.outcome["status"] == "completed", (session.outcome, events)
    assert session._autonomous_run.verified()
    assert not any(event["type"] == "approval" for event in events)
    assert session._autonomous_run.receipt["exit_code"] == 0
    assert "calc.py" in session._memory.summary()
    stored = json.loads(session._memory.path.read_text(encoding="utf-8"))
    assert any(receipt["command"] == command for receipt in stored["commands"])
    assert (root / "calc.py").read_text(encoding="utf-8").endswith("return 2\n")


def test_false_completion_stops_without_infinite_retries(session, monkeypatch):
    session.configure_autonomy(True, "python -m pytest -q")
    attempts = []

    def runner(prompt, *, event_fn, **kwargs):
        attempts.append(prompt)
        return finish(event_fn)

    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    events = []
    session.run_turn("実装して検証", events.append)
    assert len(attempts) == 2
    assert session.outcome == {"status": "failed", "reason": "verification_unresolved"}
    assert any(event["type"] == "error" for event in events)


def test_recovery_obeys_shared_llm_budget(session, monkeypatch):
    monkeypatch.setattr(settings, "turn_max_llm_calls", 1)
    session.configure_autonomy(True, "python -m pytest -q")
    def runner(prompt, *, event_fn, control, **kwargs):
        control.charge("llm_calls")
        return finish(event_fn)
    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    session.run_turn("実装", lambda event: None)
    assert session.outcome == {"status": "limit_reached", "reason": "llm_calls_limit"}


def test_only_selected_command_at_selected_workspace_is_automatic(tmp_path):
    run = AutonomousRun(tmp_path, enabled=True, command="python -m pytest -q")
    assert run.allows_command({"command": run.command})
    assert not run.allows_command({"command": run.command + "; echo injected"})
    assert not run.allows_command({"command": run.command, "working_directory": ".."})
    assert not run.allows_command({"command": run.command, "input": "override"})
    assert run.allows_changes(["a.py", "sub/b.py"])
    assert not run.allows_changes(["../outside.py"])
    assert not run.allows_changes([".git/config"])
    assert not run.allows_changes([".pixie_sessions/data.json"])
    assert not run.allows_changes([".PIXIE_sessions/data.json"])


def test_fresh_command_receipt_invalidated_by_edit_and_external_change(tmp_path):
    path = tmp_path / "source.py"
    path.write_text("first", encoding="utf-8")
    run = AutonomousRun(tmp_path, enabled=True, command="pytest -q")
    run.changed(["source.py"])
    started = run.command_started()
    receipt = {"command": run.command, "cwd": str(tmp_path), "exit_code": 0}
    run.command_finished(receipt, started)
    assert run.verified()
    path.write_text("external", encoding="utf-8")
    assert not run.verified()
    run.command_finished(receipt, run.command_started())
    assert run.verified()
    run.changed(["source.py"])
    assert not run.verified()


def test_source_changed_during_command_does_not_verify(tmp_path):
    path = tmp_path / "source.py"
    path.write_text("first", encoding="utf-8")
    run = AutonomousRun(tmp_path, enabled=True, command="pytest -q")
    run.changed(["source.py"])
    started = run.command_started()
    path.write_text("changed during test", encoding="utf-8")
    run.command_finished({"command": run.command, "cwd": str(tmp_path), "exit_code": 0}, started)
    assert not run.verified()


def test_read_only_turn_defers_content_snapshot(session, monkeypatch):
    calls = []
    monkeypatch.setattr(session, "take_turn_snapshot", calls.append)
    session.prepare_turn_snapshot(1)
    session._emit_event = lambda event: None
    assert session._approve([call("read_file", path="source.py")], "read")[0]
    assert not calls
    session.ensure_turn_snapshot()
    session.ensure_turn_snapshot()
    assert calls == [1]


def test_plan_rejects_hallucinated_edit_before_changeset(session):
    root = Path(session.workspace)
    session.configure_autonomy(True, "pytest -q")
    session.set_plan_phase(True)
    session._emit_event = lambda event: None
    approved, override = session._approve([call("write_file", path="unexpected.py", content="bad")], "edit")
    assert not approved and "計画" in override
    assert not (root / "unexpected.py").exists()


def test_request_reservation_resets_prior_autonomy(session):
    from app import main
    session.configure_autonomy(True, "pytest -q")
    assert main._reserve_turn(session)
    try:
        assert not session._autonomous_run.enabled
        assert not session._autonomous_run.command
    finally:
        main._release_turn(session)


def test_manual_mixed_edit_invalidates_prior_verification(session):
    root = Path(session.workspace)
    session.configure_autonomy(True, "pytest -q")
    run = session._autonomous_run
    run.command_finished({"command": run.command, "cwd": str(root), "exit_code": 0}, run.command_started())
    assert run.verified()
    session._approval_timeout = 1
    def emit(event):
        if event["type"] == "approval":
            session.resolve_approval(event["id"], True)
    session._emit_event = emit
    calls = [call("read_file", path="old.py"), call("write_file", path="new.py", content="new")]
    approved, override = session._approve(calls, "mixed")
    assert approved == calls and override is None
    assert not run.verified()


def test_compaction_preserves_task_and_current_turn_handles(session, monkeypatch):
    original = "auth.pyは変更禁止。長いプロジェクトの不具合を直す。"
    session._memory.record_request(original)
    history = []
    for index in range(35):
        history.extend([{"role": "user", "content": f"情報 {index}"},
                        {"role": "assistant", "content": f"観測 {index}"}])
    # Populate a long live history without using the core's 20-message loader.
    session._engine.state.chat_history.messages = history
    monkeypatch.setattr(settings, "session_context_max_chars", 1000)
    def runner(prompt, *, event_fn, **kwargs):
        session._engine.state.chat_history.add("user", prompt)
        session._engine.state.chat_history.add("assistant", "回答")
        return finish(event_fn)
    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    turn_id = session.begin_turn("続けて")
    session.run_turn("続けて", lambda event: None)
    session.end_turn()
    assert original in session._engine.history_tail(0)[0]["content"]
    assert session.turns[-1]["id"] == turn_id
    handles = session.turns[-1]["handles"]
    assert len(handles) == 2 and handles[0]["content"].endswith("続けて")
    assert handles[1]["content"] == "回答"


def test_old_display_log_cannot_roll_back_durable_user_directive(session):
    session._memory.record_request("出力はXMLで")
    session._memory.record_request("出力はJSONに変更して")
    session.restore_context([{"role": "user", "content": "出力はXMLで"}])
    assert session._memory.current_task() == "出力はJSONに変更して"
    assert "出力はJSONに変更して" in session._engine.history_tail(0)[0]["content"]


def test_short_core_trimmed_history_restores_task_anchor_before_next_turn(session, monkeypatch):
    from pixie_core import engine as core_engine

    original = "auth.pyは変更禁止。APIの不具合を直す。"
    session._memory.record_request(original)
    messages = [
        {"role": "system", "content": "system"},
        {"role": "user", "content": original},
        {"role": "assistant", "content": "確認した内容 " + "x" * 2_000},
        {"role": "user", "content": "前の調査結果 " + "y" * 2_000},
        {"role": "assistant", "content": "次はAPIを確認する。"},
        {"role": "user", "content": "続けて"},
    ]
    # Exercise the real core hard trim without generating a whiteboard or an LLM
    # request. It removes the original request while leaving a small live tail.
    monkeypatch.setattr(core_engine, "estimate_tokens", lambda llm, text: len(text))
    monkeypatch.setattr(core_engine, "_update_whiteboard", lambda *args, **kwargs: None)
    trimmed = core_engine.check_and_trim_context(None, messages, max_context=100,
                                               output_fn=lambda *args, **kwargs: None)
    session._engine.state.chat_history.messages = trimmed[1:]
    assert not session._memory.has_request_context(session._engine.history_tail(0))
    assert len(session._engine.history_tail(0)) < 20
    assert len(json.dumps(session._engine.history_tail(0))) < settings.session_context_max_chars

    def runner(prompt, *, event_fn, **kwargs):
        before = session._engine.history_tail(0)
        assert original in before[0]["content"]
        assert session._memory.has_request_context(before)
        session._engine.state.chat_history.add("user", prompt)
        session._engine.state.chat_history.add("assistant", "調査を続けました")
        return finish(event_fn)

    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    turn_id = session.begin_turn("引き続き")
    session.run_turn("引き続き", lambda event: None)
    session.end_turn()
    assert session.outcome["status"] == "completed"
    assert session.turns[-1]["id"] == turn_id
    assert len(session.turns[-1]["handles"]) == 2
    assert original in session._memory.summary()


def test_forget_prevents_worker_from_recreating_checkpoint(session):
    session._memory.record_request("保存する作業")
    session._save_memory(publish=True)
    path = session._memory.path
    assert path.exists()
    session.forget_memory()
    session._save_memory(publish=True)
    assert not path.exists()


def test_missing_anchor_blocks_edit_with_checkpoint_override(session, monkeypatch):
    original = "auth.py は変更禁止。APIだけを修正する。"
    session._memory.record_request(original)
    session.configure_autonomy(True)
    session._engine.state.chat_history.messages = [
        {"role": "assistant", "content": "大きい履歴をトリムした後の短い観測"},
        {"role": "user", "content": "続けて"},
    ]
    session._emit_event = lambda event: None
    monkeypatch.setattr(session._engine, "apply_changeset", lambda *args: pytest.fail("lost constraints must block the edit"))
    approved, override = session._approve([call("write_file", path="auth.py", content="bad")], "edit")
    assert not approved and original in override
    assert "前の作業を続けて" in override
    assert "過去の承認から今回の操作の許可を推定しない" in override
    assert session._engine.history_tail(0)[0]["role"] == "assistant"


def test_deleted_turn_does_not_reappear_in_saved_memory_or_empty_restore(session, monkeypatch):
    from app.session_memory import SessionMemory

    original = "FIRST_DIRECTIVE_REMOVE"
    later = "SECOND_DIRECTIVE_KEEP"

    def runner(prompt, *, event_fn, **kwargs):
        session._engine.state.chat_history.add("user", prompt)
        marker = "FIRST_OBSERVATION_REMOVE" if original in prompt else "SECOND_OBSERVATION_KEEP"
        session._engine.state.chat_history.add("assistant", marker)
        return finish(event_fn)

    monkeypatch.setattr(session._engine, "run_turn_events", runner)
    first = session.begin_turn(original)
    session.run_turn(original, lambda event: None)
    session.end_turn()
    second = session.begin_turn(later)
    session.run_turn(later, lambda event: None)
    session.end_turn()

    assert session.drop_turn(first) == 2
    restarted = SessionMemory(session.workspace, "autonomous-test")
    restored = json.dumps(restarted.restore_messages(), ensure_ascii=False)
    assert original not in restored and "FIRST_OBSERVATION_REMOVE" not in restored
    assert later in restored and "SECOND_OBSERVATION_KEEP" in restored
    assert session.turns[-1]["id"] == second
    assert session.drop_turn(second) == 2
    assert not session._memory.has_content and session._memory.has_checkpoint

    # An old UI sidecar is supplemental and cannot resurrect an intentionally
    # empty durable checkpoint after a server restart.
    session._memory = SessionMemory(session.workspace, "autonomous-test")
    session.restore_context([{"role": "user", "content": original}])
    assert session._engine.history_tail(0) == []
    assert not session._memory.has_content


def test_manual_code_compact_preserves_records_without_model_or_tools(session, monkeypatch):
    from app import compact
    session._memory.record_request("auth.pyは変更禁止")
    session._engine.history_replace([
        {"role": "user", "content": "実装を続ける"},
        {"role": "assistant", "content": "調査しました"}])
    monkeypatch.setattr(session, "run_turn", lambda *args, **kwargs: pytest.fail("compact must not run tools or LLM"))
    events = []
    compact.run(session, focus="認証", emit=events.append)
    assert session._engine.history_size() == 2
    assert "auth.pyは変更禁止" in session._engine.history_tail(0)[0]["content"]
    assert "認証" in session._engine.history_tail(0)[0]["content"]
    assert any(event["type"] == "compacted" for event in events)


def test_wrong_tool_name_in_command_gets_metadata_without_execution(session):
    session.configure_autonomy(True, "pytest -q")
    session._emit_event = lambda event: pytest.fail("No command/approval required for workspace metadata")
    approved, override = session._approve([call("run_command", command="get_cwd")], "cwd")
    assert not approved and session.workspace in override


def test_server_checkpoint_can_be_found_without_browser_save(session, monkeypatch):
    from app import code_chat
    root = Path(session.workspace)
    monkeypatch.setattr(code_chat.config, "WORKSPACE", root)
    monkeypatch.setattr(session._engine, "run_turn_events", lambda prompt, event_fn, **kwargs: finish(event_fn))
    session.run_turn("継続するプロジェクト作業", lambda event: None)
    listed = code_chat.code_chat_sessions()["sessions"]
    assert listed[0]["session_id"] == "autonomous-test"
    assert listed[0]["title"] == "継続するプロジェクト作業"
    assert code_chat.code_chat_session("autonomous-test")["messages"]
