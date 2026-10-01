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
