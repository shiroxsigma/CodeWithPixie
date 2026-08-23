"""Bridge AWP 1.11 native events into CWP's stable event stream."""

import sys
from pathlib import Path

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
