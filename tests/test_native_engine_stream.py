"""Bridge AWP 1.11 native events into CWP's stable event stream."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import engine_adapter  # noqa: E402


class _NativeEngine:
    def __init__(self):
        self.called = None

    def run_turn_events(self, user_text, *, event_fn, interactive_fn, show_thinking):
        self.called = (user_text, interactive_fn, show_thinking)
        event_fn({"type": "turn_started"})
        event_fn({"type": "output", "text": "hello", "end": "", "flush": True})
        event_fn({
            "type": "turn_completed",
            "text": "hello",
            "metrics": {"llm_calls": [{}], "tool_calls": 2, "exit_reason": "completed"},
        })
        return "hello"


class _Session(engine_adapter._EngineStreamOps):
    def __init__(self):
        self._engine = _NativeEngine()
        self.events = []
        self._emit_event = self.events.append

    def _emit(self, text, end="", flush=False):
        self.events.append({"type": "token", "text": text, "flush": flush})


def test_native_output_and_metrics_are_bridged_once():
    session = _Session()
    guard = object()

    result = session._run_engine_stream(
        "question", interactive_fn=guard, show_thinking=True
    )

    assert result == "hello"
    assert session.outcome == {"status": "completed", "reason": "completed"}
    assert session._engine.called == ("question", guard, True)
    assert session.events == [
        {"type": "token", "text": "hello", "flush": True},
        {
            "type": "turn_metrics",
            "metrics": {
                "llm_calls": [{}],
                "tool_calls": 2,
                "exit_reason": "completed",
            },
        },
    ]


@pytest.mark.parametrize(("reason", "status"), [
    ("final_answer (ツール実行 2回後)", "completed"),
    ("final_answer (状態保存と同時完了・ツール実行 2回後)", "completed"),
    ("final_answer_simple_direct (ツール実行 0回後)", "completed"),
    ("final_answer_acceptance_unresolved", "failed"),
    ("fallback_response (空応答2回で直前の回答を使用)", "failed"),
    ("empty_response (再試行2回で空応答継続)", "failed"),
    ("llm_connection_error (connection refused)", "failed"),
    ("loop_force_exit (read_file の無限ループが3回検知)", "failed"),
    ("thinking_timeout (思考時間超過が3回続きました)", "limit_reached"),
    ("max_tool_calls_reached (連続実行上限100回)", "limit_reached"),
    ("max_tool_calls_reached_with_final (参考回答のみ強制生成)", "limit_reached"),
    ("iteration_limit (全体反復上限)", "limit_reached"),
    ("continuation_limit (継続生成上限)", "limit_reached"),
    ("turn_timeout", "limit_reached"),
    ("llm_calls_limit", "limit_reached"),
    ("tool_calls_limit", "limit_reached"),
    ("user_rejected (ユーザーがツール実行を却下)", "cancelled"),
    ("cancelled", "cancelled"),
    ("new_unknown_exit", "failed"),
    ("final_answer_future_failure", "failed"),
    ("", "failed"),
    (None, "failed"),
])
def test_completion_event_maps_engine_reason_without_false_success(reason, status):
    session = _Session()
    session.outcome = {"status": "completed", "reason": "completed"}
    metrics = {"exit_reason": reason, "tool_calls": 2}
    session._on_engine_event({"type": "turn_completed", "metrics": metrics})
    assert session.outcome == {"status": status, "reason": reason or "missing_exit_reason"}
    assert session.events == [{"type": "turn_metrics", "metrics": metrics}]


def test_completion_without_metrics_is_not_treated_as_success():
    session = _Session()
    session._on_engine_event({"type": "turn_completed"})
    assert session.outcome == {"status": "failed", "reason": "missing_exit_reason"}


def test_structured_tokens_preserve_whitespace_without_cli_prefix_or_duplicates():
    session = _Session()
    text = "本文\n\n```python\na = 1\n\nb = 2\n```"
    session._on_engine_event({"type": "response_start", "response_id": 1})
    session._on_engine_event({"type": "output", "text": "AI: "})
    session._on_engine_event({"type": "token", "response_id": 1, "text": text})
    session._on_engine_event({"type": "output", "text": text})
    session._on_engine_event({"type": "output", "text": "\n"})
    session._on_engine_event({"type": "response_end", "response_id": 1, "progress": False})
    assert "".join(e.get("text", "") for e in session.events if e["type"] == "token") == text
    assert [e["type"] for e in session.events] == ["response_start", "token", "response_end"]


@pytest.mark.parametrize("native", [True, False])
def test_incomplete_tool_envelope_is_failure_without_retry(native):
    from types import SimpleNamespace
    session = _Session()
    calls = []
    broken = "<parameter=\n</parameter>\n</function>\n</tool_call>\n"

    def runner(user_text, **kwargs):
        calls.append(user_text)
        if native:
            kwargs["event_fn"]({"type": "turn_completed", "text": broken,
                "metrics": {"tool_calls": 0, "exit_reason": "final_answer"}})
        return broken

    session._engine = SimpleNamespace(**{"run_turn_events" if native else "run_turn": runner})
    assert session._run_engine_stream("edit", interactive_fn=None) == broken
    assert calls == ["edit"]
    assert session.outcome == {"status": "failed", "reason": "incomplete_tool_markup"}
    assert session.events[-1]["type"] == "error"


@pytest.mark.parametrize("text", [
    "<tool_call><function=write_file><parameter=path>",
    "</parameter>\n</function>\n</tool_call>",
    "<tool_call>\n<function>\n<parameter>",
])
def test_bare_broken_tool_markup_is_detected(text):
    assert engine_adapter._incomplete_tool_markup(text)


@pytest.mark.parametrize("text", [
    "Tests passed.", "", None,
    "```xml\n</function>\n</tool_call>\n```",
    "The response contained </function> and </tool_call>.",
    "<tool_call><function><parameter/></function></tool_call>",
    "<tool_call></tool_call><tool_call></tool_call>",
    '<tool_call><function name="example"><parameter>value</parameter></function></tool_call>',
    "<root><value>example</value></root>",
    "<tool_call>literal text</tool_call>",
    "<function>ordinary XML fragment without a tool envelope",
])
def test_prose_code_and_valid_xml_are_not_reclassified(text):
    assert not engine_adapter._incomplete_tool_markup(text)
