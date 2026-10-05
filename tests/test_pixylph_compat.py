"""Pixylph uses native function calls; no textual conversion at the boundary."""
from types import SimpleNamespace
from app.model_compat import configure_engine, prepare_server, uses_qwen_tools


def test_native_history_tools_and_sampling_settings_survive():
    sent = []
    def completion(messages, **kwargs):
        sent.append((messages, kwargs))
        return iter([{'choices': [{'delta': {'tool_calls': []}, 'finish_reason': 'tool_calls'}]}])
    backend = SimpleNamespace(create_chat_completion=completion, read_idle_timeout=30)
    engine = SimpleNamespace(context=SimpleNamespace(llm=backend, supports_tool_role=False))
    configure_engine(engine, {'model': 'pixylph-moe', 'max_tokens': 4096})
    messages = [{'role': 'assistant', 'content': None, 'tool_calls': [{'id': 'call_1', 'type': 'function',
                 'function': {'name': 'read_file', 'arguments': '{"path":"README.md"}'}}]},
                {'role': 'tool', 'tool_call_id': 'call_1', 'content': 'file contents'}]
    tools = [{'type': 'function', 'function': {'name': 'read_file'}}]
    choice = {'type': 'function', 'function': {'name': 'read_file'}}
    list(backend.create_chat_completion(messages, tools=tools, tool_choice=choice, max_tokens=8192,
             temperature=.7, top_p=.95, thinking_budget_tokens=256))
    assert sent[0][0] is messages
    options = sent[0][1]
    assert options['tools'] is tools and options['tool_choice'] is choice
    assert options['max_tokens'] == 4096 and options['temperature'] == .7
    assert options['top_p'] == .95 and options['thinking_budget_tokens'] is None
    assert engine.context.supports_tool_role
    assert engine.context.native_tool_calls_only
    assert uses_qwen_tools(engine)
    assert backend.read_idle_timeout == 120


def test_timeout_is_defaulted_without_changing_explicit_value():
    assert prepare_server({'model': 'pixylph-moe'})['read_idle_timeout'] == 120
    assert prepare_server({'model': 'pixylph-moe', 'read_idle_timeout': 77})['read_idle_timeout'] == 77


def test_quoted_tool_example_remains_text(monkeypatch, tmp_path):
    from app import engine_adapter
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend
    monkeypatch.setattr(LMStudioBackend, '_fetch_n_ctx', lambda _: 131072)
    example = 'Example: <tool_call>{"name":"read_file","arguments":{"path":"README.md"}}</tool_call>'
    def completion(self, messages, **kwargs):
        yield {'choices': [{'delta': {'content': example}, 'finish_reason': 'stop'}]}
    monkeypatch.setattr(LMStudioBackend, 'create_chat_completion', completion)
    core = engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)
    agent = engine_adapter._create_profiled_engine(core, {'model': 'pixylph-moe'}, str(tmp_path), name='note', tool_set={'read_file'})
    agent.state.chat_history.add('user', 'Show a tool call example, without executing it.')
    content, calls = core_engine.node_plan(agent.context, agent.state, output_fn=lambda *a, **k: None,
                                          system_msg_builder=lambda *a, **k: 'Explain the syntax.')
    assert not calls
    assert '<tool_call>' in content
