"""Regression tests for Qwen streams that stop before a complete answer."""

from types import SimpleNamespace

import pytest

from app import engine_adapter, model_compat


def _wrapped_qwen_completion(completion):
    backend = SimpleNamespace(
        create_chat_completion=completion,
        _thinking_budget_supported=None,
    )
    engine = SimpleNamespace(context=SimpleNamespace(
        llm=backend, supports_tool_role=False,
    ))
    model_compat.configure_engine(engine, {"model": "qwen3.6-35b-a3b"})
    return backend.create_chat_completion


def test_inline_thinking_only_length_retries_before_core_continuation(
    monkeypatch, tmp_path,
):
    from pixie_core import engine as core_engine
    from pixie_core.engine_helpers import strip_all_thinking
    from pixie_core.llm_client import LMStudioBackend

    monkeypatch.setattr(LMStudioBackend, "_fetch_n_ctx", lambda _: 32768)
    calls = []

    def completion(self, messages, **kwargs):
        calls.append(dict(kwargs))
        if len(calls) == 1:
            yield {"choices": [{"delta": {"content": "<think>Still reasoning.</think>"},
                                "finish_reason": None}]}
            yield {"choices": [{"delta": {}, "finish_reason": "length"}]}
        else:
            yield {"choices": [{"delta": {"content": "The answer is 42."},
                                "finish_reason": "stop"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    agent = engine_adapter._create_profiled_engine(
        core,
        {"name": "Qwen 3.6", "base_url": "http://127.0.0.1:8136/v1",
         "api_key": "local", "model": "qwen3.6-35b-a3b"},
        str(tmp_path), name="code", tool_set=engine_adapter.CODE_TOOLS,
    )
    agent.state.chat_history.add("user", "What is the answer?")
    content, tool_calls = core_engine.node_plan(
        agent.context, agent.state, show_thinking=False,
        output_fn=lambda *args, **kwargs: None,
        system_msg_builder=lambda *args, **kwargs: "Answer the user.",
    )

    assert len(calls) == 2
    assert calls[1]["thinking_budget_tokens"] == 1
    assert strip_all_thinking(content) == "The answer is 42."
    assert tool_calls is None
    assert agent.state.phase != "NEEDS_CONTINUATION"


@pytest.mark.parametrize("arguments", ['{"path":', '{"path":"config.txt"}'])
def test_length_stopped_tool_calls_are_not_returned_for_execution(
    monkeypatch, tmp_path, arguments,
):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    monkeypatch.setattr(LMStudioBackend, "_fetch_n_ctx", lambda _: 32768)

    calls = []

    def completion(self, messages, **kwargs):
        calls.append(dict(kwargs))
        yield {"choices": [{"delta": {"tool_calls": [{
            "index": 0, "id": "call_read", "type": "function",
            "function": {"name": "read_file", "arguments": arguments},
        }]}, "finish_reason": None}]}
        yield {"choices": [{"delta": {}, "finish_reason": "length"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    agent = engine_adapter._create_profiled_engine(
        core,
        {"name": "Qwen 3.6", "base_url": "http://127.0.0.1:8136/v1",
         "api_key": "local", "model": "qwen3.6-35b-a3b"},
        str(tmp_path), name="code", tool_set=engine_adapter.CODE_TOOLS,
    )
    agent.state.chat_history.add("user", "Read config.txt")
    _, tool_calls = core_engine.node_plan(
        agent.context, agent.state, show_thinking=False,
        output_fn=lambda *args, **kwargs: None,
        system_msg_builder=lambda *args, **kwargs: "Use the available tools.",
    )

    assert len(calls) == 2
    assert calls[1]["thinking_budget_tokens"] == 1
    assert tool_calls is None
    assert agent.state.llm_error


def test_tool_retry_forwards_only_completed_second_attempt():
    calls = []

    def completion(messages, **kwargs):
        calls.append(dict(kwargs))
        if len(calls) == 1:
            yield {"choices": [{"delta": {"tool_calls": [{
                "index": 0, "id": "call_partial", "type": "function",
                "function": {"name": "read_file", "arguments": '{"path":'},
            }]}, "finish_reason": None}]}
            yield {"choices": [{"delta": {}, "finish_reason": "length"}]}
        else:
            yield {"choices": [{"delta": {"tool_calls": [{
                "index": 0, "id": "call_complete", "type": "function",
                "function": {"name": "read_", "arguments": '{"path":'},
            }]}, "finish_reason": None}]}
            yield {"choices": [{"delta": {"tool_calls": [{
                "index": 0, "function": {"name": "file", "arguments": '"config.txt"}'},
            }]}, "finish_reason": None}]}
            yield {"choices": [{"delta": {}, "finish_reason": "tool_calls"}]}

    wrapped = _wrapped_qwen_completion(completion)
    result = list(wrapped([{"role": "user", "content": "Read config.txt"}], max_tokens=400))

    assert len(calls) == 2
    assert calls[1]["thinking_budget_tokens"] == 1
    assert len(result) == 3
    tool_chunks = [choice["delta"]["tool_calls"]
                   for chunk in result for choice in chunk["choices"]
                   if choice.get("delta", {}).get("tool_calls")]
    assert len(tool_chunks) == 2
    assert tool_chunks[0][0]["id"] == "call_complete"
    assert "".join(chunk[0]["function"]["name"] for chunk in tool_chunks) == "read_file"
    assert "".join(chunk[0]["function"]["arguments"] for chunk in tool_chunks) == '{"path":"config.txt"}'
    assert result[-1]["choices"][0]["finish_reason"] == "tool_calls"
    assert not any(chunk.get("__llm_error__") for chunk in result)


def test_incomplete_tool_call_at_stop_is_rejected():
    def completion(messages, **kwargs):
        yield {"choices": [{"delta": {"tool_calls": [{
            "index": 0, "id": "call_partial", "type": "function",
            "function": {"name": "read_file", "arguments": '{"path":'},
        }]}, "finish_reason": None}]}
        yield {"choices": [{"delta": {}, "finish_reason": "stop"}]}

    wrapped = _wrapped_qwen_completion(completion)
    result = list(wrapped([{"role": "user", "content": "Read config.txt"}], max_tokens=400))

    assert len(result) == 1
    assert result[0]["choices"][0]["finish_reason"] == "error"
    assert result[0].get("__llm_error__")


def test_visible_preface_prevents_tool_retry_and_duplicate_text():
    calls = []

    def completion(messages, **kwargs):
        calls.append(dict(kwargs))
        yield {"choices": [{"delta": {"content": "I will read the file."},
                            "finish_reason": None}]}
        yield {"choices": [{"delta": {"tool_calls": [{
            "index": 0, "id": "call_partial", "type": "function",
            "function": {"name": "read_file", "arguments": '{"path":'},
        }]}, "finish_reason": None}]}
        yield {"choices": [{"delta": {}, "finish_reason": "length"}]}

    wrapped = _wrapped_qwen_completion(completion)
    result = list(wrapped([{"role": "user", "content": "Read config.txt"}], max_tokens=400))

    assert len(calls) == 1
    assert len(result) == 2
    assert result[0]["choices"][0]["delta"]["content"] == "I will read the file."
    assert result[1]["choices"][0]["finish_reason"] == "error"
    assert not any(choice["delta"].get("tool_calls")
                   for chunk in result for choice in chunk["choices"])
