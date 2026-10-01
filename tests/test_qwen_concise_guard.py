"""Qwen Note may keep a requested short answer when a file read proves it."""

from types import SimpleNamespace
import json

import pytest

from app import engine_adapter, qwen_concise_guard


QWEN_SERVER = {
    "base_url": "http://127.0.0.1:8136/v1",
    "api_key": "local",
    "model": "qwen3.6-35b-a3b",
}
ENGLISH = "Read value.txt and answer with the exact numeric value in one short sentence."
JAPANESE = "value.txt を読んで、数値だけ短く答えてください。"


@pytest.fixture
def core(monkeypatch):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    monkeypatch.setattr(LMStudioBackend, "_fetch_n_ctx", lambda _: 32768)
    monkeypatch.setattr(core_engine, "LESSONS_ENABLED", False)
    monkeypatch.setattr(core_engine, "BEST_OF_ANSWER_ENABLED", False)
    return engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)


def _state(prompt=ENGLISH, path="value.txt", result="[value.txt] 全1行 (0.0 KB)\nvalue=739251\n"):
    return SimpleNamespace(chat_history=SimpleNamespace(messages=[
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": None, "tool_calls": [{
            "id": "read_1", "type": "function",
            "function": {"name": "read_file", "arguments": json.dumps({"path": path})},
        }]},
        {"role": "tool", "tool_call_id": "read_1", "content": result},
    ]), executed_actions=[f'read_file:{json.dumps({"path": path})}'])


@pytest.mark.parametrize("prompt", [ENGLISH, JAPANESE])
def test_verified_short_numeric_answer_is_accepted_in_scope(core, prompt):
    from pixie_core import engine as core_engine

    state = _state(prompt=prompt)
    qwen_concise_guard.install(core)
    with qwen_concise_guard.note_turn(core, state):
        assert core_engine._is_simple_direct_answer_sufficient(
            prompt, "739251", state,
        ) is True


@pytest.mark.parametrize("result, answer, path, prompt", [
    ("[value.txt] 全1行 (0.0 KB)\nvalue=739251\n", "739252", "value.txt", ENGLISH),
    ("[value739251.txt] 全1行 (0.0 KB)\nno number\n", "739251", "value739251.txt",
     "Read value739251.txt and answer with the exact numeric value in one short sentence."),
    ("[value.txt] 1行目〜1行目 (全1行)\n739251: no number\n", "739251", "value.txt", ENGLISH),
    ("Error: ファイルが存在しません (value.txt)。739251", "739251", "value.txt", ENGLISH),
    ("エラー: value.txt を読めません\n[value.txt] 全1行 (0.0 KB)\nvalue=739251\n", "739251", "value.txt", ENGLISH),
    ("[value.txt] 全2行 (0.0 KB)\nvalue=739251\nother=2026\n", "739251", "value.txt", ENGLISH),
])
def test_short_answer_requires_unique_number_in_successful_file_body(
    core, result, answer, path, prompt,
):
    from pixie_core import engine as core_engine

    state = _state(prompt=prompt, path=path, result=result)
    with qwen_concise_guard.note_turn(core, state):
        assert core_engine._is_simple_direct_answer_sufficient(
            prompt, answer, state,
        ) is False


def test_other_requests_and_sessions_keep_core_guard(core):
    from pixie_core import engine as core_engine

    state = _state()
    other = _state()
    substantive = "Read value.txt and explain the calculation and its implications."
    with qwen_concise_guard.note_turn(core, state):
        assert core_engine._is_simple_direct_answer_sufficient(
            ENGLISH, "739251", other,
        ) is False
        assert core_engine._is_simple_direct_answer_sufficient(
            substantive, "739251", state,
        ) is False
    assert core_engine._is_simple_direct_answer_sufficient(
        ENGLISH, "739251", state,
    ) is False


def test_existing_core_acceptance_is_preserved(core):
    from pixie_core import engine as core_engine

    prompt = "value.txt を読んで、数値を短く答えてください。"
    state = _state(prompt=prompt)
    answer = "The file value.txt contains 739252 as the value, based on the displayed file content."
    qwen_concise_guard.install(core)
    assert core_engine._is_simple_direct_answer_sufficient.__wrapped__(
        prompt, answer, state,
    ) is True
    with qwen_concise_guard.note_turn(core, state):
        assert core_engine._is_simple_direct_answer_sufficient(
            prompt, answer, state,
        ) is True


@pytest.mark.parametrize("missing", [None, "not callable"])
def test_install_tolerates_core_without_private_helper(monkeypatch, missing):
    module = SimpleNamespace()
    if missing is not None:
        module._is_simple_direct_answer_sufficient = missing
    monkeypatch.setattr(qwen_concise_guard, "import_module", lambda _: module)
    qwen_concise_guard.install(SimpleNamespace(__name__="older_pixie_core"))


def test_requested_subpath_must_match_the_read_tool_path(core):
    from pixie_core import engine as core_engine

    prompt = "Read foo/value.txt and answer with the numeric value in one short sentence."
    wrong = _state(prompt=prompt, path="bar/value.txt")
    wrong_nested = _state(prompt=prompt, path=r"C:\work\bar\foo\value.txt")
    correct = _state(prompt=prompt, path=r"C:\work\foo\value.txt")
    with qwen_concise_guard.note_turn(core, wrong, r"C:\work"):
        assert core_engine._is_simple_direct_answer_sufficient(
            prompt, "739251", wrong,
        ) is False
    with qwen_concise_guard.note_turn(core, wrong_nested, r"C:\work"):
        assert core_engine._is_simple_direct_answer_sufficient(
            prompt, "739251", wrong_nested,
        ) is False
    with qwen_concise_guard.note_turn(core, correct, r"C:\work"):
        assert core_engine._is_simple_direct_answer_sufficient(
            prompt, "739251", correct,
        ) is True


def _tool_stream():
    yield {"choices": [{"delta": {"tool_calls": [{
        "index": 0, "id": "read_1", "type": "function",
        "function": {"name": "read_file", "arguments": '{"path":"value.txt"}'},
    }]}, "finish_reason": None}]}
    yield {"choices": [{"delta": {}, "finish_reason": "tool_calls"}]}


def test_qwen_note_finishes_after_verified_one_sentence(core, tmp_path, monkeypatch):
    from pixie_core.llm_client import LMStudioBackend

    (tmp_path / "value.txt").write_text("value=739251\n", encoding="utf-8")
    calls = []

    def completion(self, messages, **kwargs):
        calls.append(messages)
        if len(calls) == 1:
            yield from _tool_stream()
        else:
            yield {"choices": [{"delta": {"content": "The value is 739251."},
                                "finish_reason": "stop"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    session = engine_adapter.NoteSession(core, QWEN_SERVER, str(tmp_path), False)
    events = []
    session.run_turn(ENGLISH, events.append)

    assert session.outcome["status"] == "completed"
    assert len(calls) == 2
    assert "The value is 739251." in session._engine.state.chat_history.messages[-1]["content"]
    assert not any("回答が短すぎます" in event.get("text", "") for event in events)


def test_gemma_note_does_not_activate_qwen_exception(core, tmp_path, monkeypatch):
    from pixie_core.llm_client import LMStudioBackend

    (tmp_path / "value.txt").write_text("value=739251\n", encoding="utf-8")
    calls = []

    def completion(self, messages, **kwargs):
        calls.append(messages)
        if len(calls) == 1:
            yield from _tool_stream()
        else:
            yield {"choices": [{"delta": {"content": "The value is 739251."},
                                "finish_reason": "stop"}]}

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    session = engine_adapter.NoteSession(
        core, {**QWEN_SERVER, "model": "gemma-4"}, str(tmp_path), False,
    )
    events = []
    session.run_turn(ENGLISH, events.append)

    assert len(calls) > 2
    assert any("回答が短すぎます" in event.get("text", "") for event in events)
