"""Qwen repeated-read behavior through the embedded Pixie engine."""

import json
from functools import wraps
from pathlib import Path

import pytest

from app import engine_adapter, qwen_read_guard


QWEN_SERVER = {
    "name": "Qwen 3.6",
    "base_url": "http://127.0.0.1:8136/v1",
    "api_key": "local",
    "model": "qwen3.6-35b-a3b",
}


@pytest.fixture
def core(monkeypatch):
    from pixie_core import engine as core_engine
    from pixie_core.llm_client import LMStudioBackend

    monkeypatch.setattr(LMStudioBackend, "_fetch_n_ctx", lambda _: 32768)
    monkeypatch.setattr(core_engine, "LESSONS_ENABLED", False)
    monkeypatch.setattr(core_engine, "BEST_OF_ANSWER_ENABLED", False)
    return engine_adapter.bootstrap(engine_adapter.config.AWP_SRC)


def _tool_response(path: str, call_id: str):
    return [
        {"choices": [{"delta": {"tool_calls": [{
            "index": 0,
            "id": call_id,
            "type": "function",
            "function": {"name": "read_file", "arguments": json.dumps({"path": path})},
        }]}, "finish_reason": None}]},
        {"choices": [{"delta": {}, "finish_reason": "tool_calls"}]},
    ]


def _final_response():
    return [{"choices": [{"delta": {
        "content": "確認した二つのファイルの内容をもとに回答します。必要な情報は揃っており、同じファイルを再読込する必要はありません。"
    }, "finish_reason": "stop"}]}]


def _track_reads(monkeypatch):
    from pixie_core import registry

    reads = []
    original = registry.TOOL_REGISTRY["read_file"]["func"]

    @wraps(original)
    def tracked(*args, **kwargs):
        path = args[0] if args else kwargs["path"]
        reads.append(Path(path).name)
        return original(*args, **kwargs)

    monkeypatch.setitem(registry.TOOL_REGISTRY["read_file"], "func", tracked)
    return reads


@pytest.mark.parametrize("model, expected_reads", [
    ("qwen3.6-35b-a3b", ["a.txt", "b.txt"]),
    ("gemma-4", ["a.txt", "b.txt", "a.txt", "b.txt"]),
])
def test_alternating_duplicate_reads_are_filtered_for_qwen_only(
    core, tmp_path, monkeypatch, model, expected_reads,
):
    from pixie_core.llm_client import LMStudioBackend

    (tmp_path / "a.txt").write_text("alpha", encoding="utf-8")
    (tmp_path / "b.txt").write_text("beta", encoding="utf-8")
    reads = _track_reads(monkeypatch)
    requested = ["a.txt", "b.txt", "a.txt", "b.txt"]
    calls = []

    def completion(self, messages, **kwargs):
        index = len(calls)
        calls.append(index)
        yield from (_tool_response(requested[index], f"call_{index}")
                    if index < len(requested) else _final_response())

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    session = engine_adapter.NoteSession(
        core, {**QWEN_SERVER, "model": model}, str(tmp_path), False)
    session.run_turn("a.txt と b.txt の内容を確認してください。", lambda event: None)

    assert reads == expected_reads


def test_read_after_file_change_is_allowed_without_stale_annotation(
    core, tmp_path, monkeypatch,
):
    from pixie_core.llm_client import LMStudioBackend

    target = tmp_path / "a.txt"
    target.write_text("version one", encoding="utf-8")
    reads = _track_reads(monkeypatch)
    calls = []

    def completion(self, messages, **kwargs):
        index = len(calls)
        calls.append(index)
        if index == 1:
            target.write_text("version two", encoding="utf-8")
        yield from (_tool_response("a.txt", f"call_{index}")
                    if index < 2 else _final_response())

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    session = engine_adapter.NoteSession(core, QWEN_SERVER, str(tmp_path), False)
    session.run_turn("a.txt の変更前後を確認してください。", lambda event: None)

    results = [message.get("content", "")
               for message in session._engine.state.chat_history.messages
               if message.get("role") == "tool"]
    assert reads == ["a.txt", "a.txt"]
    assert any("version two" in result for result in results)
    assert not any("前回と同一" in result for result in results)


def test_read_after_unsaved_buffer_change_uses_new_buffer_content(
    core, tmp_path, monkeypatch,
):
    from pixie_core import paths
    from pixie_core.llm_client import LMStudioBackend

    target = tmp_path / "a.txt"
    target.write_text("disk version", encoding="utf-8")
    reads = _track_reads(monkeypatch)
    calls = []

    def completion(self, messages, **kwargs):
        index = len(calls)
        calls.append(index)
        if index == 1:
            target.write_text("disk version two", encoding="utf-8")
            paths.update_workspace_buffer(target, "unsaved version two")
        yield from (_tool_response("a.txt", f"call_{index}")
                    if index < 2 else _final_response())

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    session = engine_adapter.NoteSession(core, QWEN_SERVER, str(tmp_path), False)
    session.set_workspace_snapshot("a.txt", "unsaved version one")
    session.run_turn("a.txt の未保存内容を確認してください。", lambda event: None)

    results = [message.get("content", "")
               for message in session._engine.state.chat_history.messages
               if message.get("role") == "tool"]
    assert reads == ["a.txt", "a.txt"]
    assert any("unsaved version two" in result for result in results)
    assert not any("前回と同一" in result for result in results)


def test_masked_prior_observation_can_be_read_again(core, tmp_path, monkeypatch):
    from pixie_core.llm_client import LMStudioBackend

    (tmp_path / "a.txt").write_text("alpha", encoding="utf-8")
    reads = _track_reads(monkeypatch)
    calls = []
    session = None

    def completion(self, messages, **kwargs):
        index = len(calls)
        calls.append(index)
        if index == 1:
            for message in session._engine.state.chat_history.messages:
                if message.get("role") == "tool":
                    message["content"] = "[a.txt]\n... [古い読込を圧縮] ..."
        yield from (_tool_response("a.txt", f"call_{index}")
                    if index < 2 else _final_response())

    monkeypatch.setattr(LMStudioBackend, "create_chat_completion", completion)
    session = engine_adapter.NoteSession(core, QWEN_SERVER, str(tmp_path), False)
    session.run_turn("a.txt を確認してください。", lambda event: None)

    assert reads == ["a.txt", "a.txt"]


def test_guard_passes_reads_through_when_content_probe_fails(
    core, tmp_path, monkeypatch,
):
    target = tmp_path / "a.txt"
    target.write_text("alpha", encoding="utf-8")
    session = engine_adapter.NoteSession(core, QWEN_SERVER, str(tmp_path), False)
    guard = qwen_read_guard.QwenReadGuard(session._engine)

    def check_forwarded(path):
        call = _tool_response(path, "call_read")[0]["choices"][0]["delta"]["tool_calls"][0]
        for _ in range(2):
            approved, override = guard.filter_calls(
                [call], engine_adapter._tc_name, engine_adapter._tc_args)
            assert approved == [call]
            assert override is None

    check_forwarded("bad\x00path.txt")

    def broken_buffer(_):
        raise RuntimeError("buffer unavailable")

    guard._get_workspace_buffer = broken_buffer
    check_forwarded("a.txt")

    guard._get_workspace_buffer = lambda _: None

    def broken_hash(*args, **kwargs):
        raise RuntimeError("hash unavailable")

    monkeypatch.setattr(qwen_read_guard.hashlib, "sha256", broken_hash)
    check_forwarded("a.txt")
