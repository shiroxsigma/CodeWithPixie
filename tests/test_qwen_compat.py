"""Qwen 3.6 compatibility at the CWP embedded engine boundary."""

import pytest

from app import engine_adapter


QWEN_MODEL = "Qwen/Qwen3.6-35B-A3B"
QWEN_SERVER = {
    "name": "Qwen 3.6",
    "base_url": "http://127.0.0.1:8136/v1",
    "api_key": "local",
    "model": QWEN_MODEL,
}


@pytest.fixture
def core(monkeypatch):
    from pixie_core.llm_client import LMStudioBackend

    monkeypatch.setattr(LMStudioBackend, "_fetch_n_ctx", lambda _: 32768)
    return engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)


def make_engine(core, model, workspace, **server_overrides):
    workspace.mkdir()
    return engine_adapter._create_profiled_engine(
        core,
        {**QWEN_SERVER, "model": model, **server_overrides},
        str(workspace),
        name="code",
        tool_set=engine_adapter.CODE_TOOLS,
    )


def _chunk(delta, finish_reason=None):
    return {"choices": [{"delta": delta, "finish_reason": finish_reason}]}


@pytest.mark.parametrize("model", [
    QWEN_MODEL,
    "huihui-qwen3.6-35b-a3b-claude-4.7-opus-abliterated-mtp",
])
def test_qwen_engine_preserves_native_tool_result_role(core, tmp_path, monkeypatch, model):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    sent = []

    def completion(self, messages, **kwargs):
        sent.extend(messages)
        yield {"choices": [{"delta": {"content": "The value is 42."}, "finish_reason": "stop"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, model, tmp_path / "qwen")
    assert agent.context.supports_tool_role is True

    agent.state.chat_history.add("user", "Read config.txt")
    agent.state.chat_history.add("assistant", tool_calls=[{
        "id": "call_read", "type": "function",
        "function": {"name": "read_file", "arguments": '{"path":"config.txt"}'},
    }])
    agent.state.chat_history.add("tool", "42", tool_call_id="call_read")
    core_engine.node_plan(
        agent.context,
        agent.state,
        output_fn=lambda *args, **kwargs: None,
        system_msg_builder=lambda *args, **kwargs: "Use the available tools.",
    )

    assert {"role": "tool", "content": "42", "tool_call_id": "call_read"} in sent


@pytest.mark.parametrize("model, expected", [
    (QWEN_MODEL, {
        "temperature": 0.6,
        "top_p": 0.95,
        "top_k": 20,
        "min_p": 0.0,
        "presence_penalty": 0.0,
        "repeat_penalty": 1.0,
    }),
    ("gemma-4", {
        "temperature": 1.0,
        "top_p": 0.95,
        "top_k": 64,
    }),
    ("generic-model", {"temperature": 0.7}),
])
def test_code_sampling_is_model_specific(core, tmp_path, monkeypatch, model, expected):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    calls = []

    def completion(self, messages, **kwargs):
        calls.append(kwargs)
        yield {"choices": [{"delta": {"content": "Done."}, "finish_reason": "stop"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, model, tmp_path / model.replace("/", "_"))
    agent.state.chat_history.add("user", "Make a precise code edit.")
    core_engine.node_plan(
        agent.context,
        agent.state,
        output_fn=lambda *args, **kwargs: None,
        system_msg_builder=lambda *args, **kwargs: "Use the available tools.",
    )

    assert len(calls) == 1
    sampling_keys = {
        "temperature", "top_p", "top_k", "min_p",
        "presence_penalty", "repeat_penalty",
    }
    assert {key: calls[0][key] for key in sampling_keys if key in calls[0]} == expected
    if model == QWEN_MODEL:
        assert 0 < calls[0]["thinking_budget_tokens"] <= calls[0]["max_tokens"] // 2
    else:
        assert "thinking_budget_tokens" not in calls[0]


def test_qwen_shallow_profile_has_a_small_reasoning_budget(core):
    from pixie_core import engine as core_engine

    profile = core_engine._select_sampling_profile(QWEN_MODEL)
    assert profile["shallow_reasoning_budget_tokens"] == 256
    assert core_engine._reasoning_budget_kwargs(profile, "shallow") == {
        "thinking_budget_tokens": 256,
    }
    assert core_engine._reasoning_budget_kwargs(profile, "deep") == {}


@pytest.mark.parametrize("max_tokens, explicit, expected", [
    (400, None, 200),
    (1024, None, 512),
    (8192, None, 2048),
    (400, 300, 300),
])
def test_qwen_thinking_budget_is_bounded_unless_explicit(
    core, tmp_path, monkeypatch, max_tokens, explicit, expected,
):
    from pixie_core.llm_client import LMStudioBackend

    calls = []

    def completion(self, messages, **kwargs):
        calls.append(kwargs)
        yield {"choices": [{"delta": {"content": "Done."}, "finish_reason": "stop"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, QWEN_MODEL, tmp_path / "qwen")
    kwargs = {} if explicit is None else {"thinking_budget_tokens": explicit}
    list(agent.context.llm.create_chat_completion(
        [{"role": "user", "content": "Answer briefly."}],
        max_tokens=max_tokens,
        **kwargs,
    ))

    assert calls[0]["thinking_budget_tokens"] == expected


@pytest.mark.parametrize("recovered, finish_reason", [
    (_chunk({"content": "The answer is 42."}), "stop"),
    (_chunk({"tool_calls": [{
        "index": 0,
        "id": "call_read",
        "type": "function",
        "function": {"name": "read_file", "arguments": '{"path":"config.txt"}'},
    }]}), "tool_calls"),
])
def test_qwen_recovers_once_from_reasoning_only_length(
    core, tmp_path, monkeypatch, recovered, finish_reason,
):
    from pixie_core.llm_client import LMStudioBackend

    calls = []
    responses = [
        [_chunk({"reasoning_content": "Still thinking."}), _chunk({}, "length")],
        [recovered, _chunk({}, finish_reason)],
    ]

    def completion(self, messages, **kwargs):
        index = len(calls)
        calls.append(dict(kwargs))
        yield from responses[index]

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, QWEN_MODEL, tmp_path / "qwen")
    result = list(agent.context.llm.create_chat_completion(
        [{"role": "user", "content": "Read config.txt and answer."}],
        max_tokens=400,
    ))

    assert len(calls) == 2
    assert calls[0]["thinking_budget_tokens"] == 200
    assert calls[1]["thinking_budget_tokens"] == 1
    assert recovered in result
    assert result[-1]["choices"][0]["finish_reason"] == finish_reason
    assert not any(chunk["choices"][0]["finish_reason"] == "length" for chunk in result)


def test_qwen_reasoning_only_length_twice_becomes_llm_error(
    core, tmp_path, monkeypatch,
):
    from pixie_core.llm_client import LMStudioBackend

    calls = []

    def completion(self, messages, **kwargs):
        calls.append(dict(kwargs))
        yield _chunk({"reasoning_content": "Still thinking."})
        yield _chunk({}, "length")

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, QWEN_MODEL, tmp_path / "qwen")
    result = list(agent.context.llm.create_chat_completion(
        [{"role": "user", "content": "Answer briefly."}],
        max_tokens=400,
    ))

    assert len(calls) == 2
    assert calls[1]["thinking_budget_tokens"] == 1
    assert result[-1]["choices"][0]["finish_reason"] == "error"
    assert result[-1].get("__llm_error__")


def test_qwen_partial_content_at_length_is_not_retried(
    core, tmp_path, monkeypatch,
):
    from pixie_core.llm_client import LMStudioBackend

    calls = []
    response = [_chunk({"reasoning_content": "Thinking."}),
                _chunk({"content": "Partial answer"}), _chunk({}, "length")]

    def completion(self, messages, **kwargs):
        calls.append(dict(kwargs))
        yield from response

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, QWEN_MODEL, tmp_path / "qwen")
    result = list(agent.context.llm.create_chat_completion(
        [{"role": "user", "content": "Explain this."}],
        max_tokens=400,
    ))

    assert calls and len(calls) == 1
    assert result == response


def test_qwen_reasoning_only_recovery_reaches_node_plan_final_answer(
    core, tmp_path, monkeypatch,
):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    calls = []

    def completion(self, messages, **kwargs):
        calls.append(dict(kwargs))
        if len(calls) == 1:
            yield _chunk({"reasoning_content": "Thinking without an answer."})
            yield _chunk({}, "length")
        else:
            yield _chunk({"content": "The value is 42."})
            yield _chunk({}, "stop")

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, QWEN_MODEL, tmp_path / "qwen")
    agent.state.chat_history.add("user", "What is the value?")
    content, tool_calls = core_engine.node_plan(
        agent.context,
        agent.state,
        show_thinking=False,
        output_fn=lambda *args, **kwargs: None,
        system_msg_builder=lambda *args, **kwargs: "Answer the user.",
    )

    assert len(calls) == 2
    assert calls[1]["thinking_budget_tokens"] == 1
    assert content == "The value is 42."
    assert tool_calls is None
    assert agent.state.phase != "NEEDS_CONTINUATION"
    assert agent.state.llm_error is None


def test_qwen_second_reasoning_only_failure_reaches_node_plan_error(
    core, tmp_path, monkeypatch,
):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    calls = []

    def completion(self, messages, **kwargs):
        calls.append(dict(kwargs))
        yield _chunk({"reasoning_content": "Still thinking."})
        yield _chunk({}, "length")

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    agent = make_engine(core, QWEN_MODEL, tmp_path / "qwen")
    agent.state.chat_history.add("user", "What is the value?")
    core_engine.node_plan(
        agent.context,
        agent.state,
        show_thinking=False,
        output_fn=lambda *args, **kwargs: None,
        system_msg_builder=lambda *args, **kwargs: "Answer the user.",
    )

    assert len(calls) == 2
    assert agent.state.llm_error
    assert agent.state.phase != "NEEDS_CONTINUATION"


@pytest.mark.parametrize("model, override, expected", [
    (QWEN_MODEL, None, 120),
    (QWEN_MODEL, 77, 77),
    ("gemma-4", None, 30),
    ("generic-model", None, 30),
])
def test_read_idle_timeout_is_model_specific(core, tmp_path, model, override, expected):
    options = {} if override is None else {"read_idle_timeout": override}
    agent = make_engine(core, model, tmp_path / "engine", **options)
    assert agent.context.llm.read_idle_timeout == expected
