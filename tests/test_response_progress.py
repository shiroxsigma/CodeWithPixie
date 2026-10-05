"""Model response boundaries must preserve inference and meaningful replies."""
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.response_progress import ResponseProgress, is_work_report  # noqa: E402
from app import engine_adapter  # noqa: E402


def chunk(content=None, *, tools=None, reason=None, reasoning=None):
    return {"choices": [{"delta": {"content": content, "tool_calls": tools,
                                  "reasoning_content": reasoning}, "finish_reason": reason}]}


@pytest.mark.parametrize("text", [
    "プロジェクト全体を解説します。まず Workset の主要ファイルを読み、構造を把握します。",
    "README.mdの全体像を読み切れていないため、残りを取得します。",
    "README.mdの全内容と主要ファイルの構造を把握した。これでプロジェクト全体像を解説できる。",
])
def test_short_work_reports_are_separate_from_answers(text):
    assert is_work_report(text, set())


@pytest.mark.parametrize("text", [
    "Pixylph-MoEはローカル推論用のCLIとHTTPサーバーです。",
    "# Pixylph-MoE\n\nC++の推論エンジンです。詳細を説明します。",
    "説明します。\n\n- C++\n- CUDA",
    "```search\n\nold\n```\n\n```replace\nnew\n```",
    "APIには `<tool_call>` が表示される問題があります。",
    "調査結果です。" * 100 + "説明します。",
    "<think>確認します。",
])
def test_answers_markdown_and_edit_blocks_are_never_work_reports(text):
    assert not is_work_report(text, {"read_file"} if text.startswith(("#", "```")) else set())


def test_observer_forwards_chunks_and_arguments_and_ignores_empty_role_delta():
    events, calls = [], []
    parts = [chunk(), chunk(reasoning="reason"), chunk("answer"), chunk(reason="stop")]
    messages = [{"role": "user", "content": "explain"}]

    def completion(**kwargs):
        calls.append(kwargs)
        yield from parts

    reporter = ResponseProgress(events.append)
    returned = list(reporter.observe(completion)(messages=messages, stream=True, max_tokens=4096))
    assert returned == parts
    assert all(a is b for a, b in zip(returned, parts))
    assert calls == [{"messages": messages, "stream": True, "max_tokens": 4096}]
    assert [e.get("phase") for e in events] == [None, "thinking", "responding"]
    assert not any(e["type"] == "response_end" for e in events)
    reporter.finish()  # core text-filter flush occurs before this boundary
    assert events[-1]["progress"] is False
    assert events[-1]["interrupted"] is False
    assert events[-1]["elapsed_sec"] >= 0
    reporter.finish()
    assert sum(e["type"] == "response_end" for e in events) == 1


def test_nonstream_completion_keeps_its_return_type_and_has_no_ui_events():
    result = {"choices": [{"message": {"content": "summary"}}]}
    events = []
    observed = ResponseProgress(events.append).observe(lambda **kwargs: result)
    assert observed(stream=False) is result
    assert events == []


def test_tool_name_fragments_and_next_response_boundary():
    events = []
    reporter = ResponseProgress(events.append)
    parts = [chunk("続けて主要ファイルを読みます。"),
             chunk(tools=[{"index": 0, "function": {"name": "read_"}}]),
             chunk(tools=[{"index": 0, "function": {"name": "file"}}], reason="tool_calls")]
    observed = reporter.observe(lambda **kwargs: iter(parts))
    list(observed(stream=True))
    list(observed(stream=True))
    boundary = next(e for e in events if e["type"] == "response_end")
    assert boundary["response_id"] == 1
    assert boundary["progress"] is True
    assert boundary["has_tool_calls"] is True
    assert events[-2]["response_id"] == 2


@pytest.mark.parametrize("reason", ["length", "error", None])
def test_interrupted_work_report_is_retained(reason):
    events = []
    reporter = ResponseProgress(events.append)
    list(reporter.observe(lambda **kwargs: iter([chunk("確認します。", reason=reason)]))(stream=True))
    reporter.finish()
    assert events[-1]["interrupted"] is True
    assert events[-1]["progress"] is False


def test_cancel_closes_underlying_stream():
    closed = []

    def completion(**kwargs):
        try:
            yield chunk("確認します。")
            yield chunk(reason="stop")
        finally:
            closed.append(True)

    reporter = ResponseProgress(lambda ev: None)
    stream = reporter.observe(completion)(stream=True)
    next(stream)
    stream.close()
    assert closed == [True]
    assert reporter.active["interrupted"] is True


@pytest.mark.parametrize("failure", [False, True])
def test_adapter_restores_backend_and_preserves_qwen_read_guard(failure, monkeypatch):
    events, approved = [], []
    completion = lambda **kwargs: iter([chunk("確認します。", reason="stop")])
    backend = SimpleNamespace(create_chat_completion=completion)
    core = SimpleNamespace(context=SimpleNamespace(llm=backend))

    def run(user_text, **kwargs):
        list(backend.create_chat_completion(stream=True))
        assert kwargs["interactive_fn"]([{"name": "read_file"}], "report") == ([{"name": "read_file"}], None)
        assert events[-1]["type"] == "response_end"
        if failure:
            raise RuntimeError("disconnected")
        return "done"

    core.run_turn_events = run
    session = engine_adapter.AgentSession.__new__(engine_adapter.AgentSession)
    session._engine, session._control = core, None
    session._emit_event = events.append
    session._new_control = lambda: None
    monkeypatch.setattr(engine_adapter.model_compat, "uses_qwen_tools", lambda engine: True)
    guard_calls = []
    guard = SimpleNamespace(filter_calls=lambda calls, *_: (guard_calls.append(calls) or calls, None))
    monkeypatch.setattr(engine_adapter, "QwenReadGuard", lambda engine: guard)

    def interactive(calls, content):
        approved.append((calls, content))
        return calls, None

    if failure:
        with pytest.raises(RuntimeError, match="disconnected"):
            session._run_engine_stream("explain", interactive_fn=interactive)
    else:
        assert session._run_engine_stream("explain", interactive_fn=interactive) == "done"
    assert len(approved) == len(guard_calls) == 1
    assert backend.create_chat_completion is completion
    assert session._response_reporter is None


def test_adapter_keeps_model_blank_lines_but_drops_separators_outside_responses():
    session = engine_adapter.AgentSession.__new__(engine_adapter.AgentSession)
    session._cancel = False
    session._classifier = engine_adapter._StreamClassifier()
    events = []
    session._emit_event = events.append
    reporter = ResponseProgress(events.append)
    session._response_reporter = reporter
    session._emit("\n\n")
    assert events == []
    stream = reporter.observe(lambda **kwargs: iter([chunk("body", reason="stop")]))(stream=True)
    next(stream)
    session._emit("```search\n\noriginal\n```\n\n```replace\nupdated\n```\n")
    assert "".join(e["text"] for e in events if e["type"] == "token") == (
        "```search\n\noriginal\n```\n\n```replace\nupdated\n```\n")
    stream.close()
