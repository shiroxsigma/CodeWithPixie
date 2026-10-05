"""Small, per-model adjustments for the shared pixie_core engine."""

from __future__ import annotations

from functools import wraps
from importlib import import_module
import json
import re


# Qwen's published settings for thinking mode on precise coding tasks:
# https://huggingface.co/Qwen/Qwen3.6-35B-A3B (Best Practices)
# pixie_core calls this ``repeat_penalty`` in its OpenAI-compatible backend.
QWEN36_CODING_PROFILE = {
    "temperature": 0.6,
    "top_p": 0.95,
    "top_k": 20,
    "min_p": 0.0,
    "presence_penalty": 0.0,
    "repeat_penalty": 1.0,
    "shallow_reasoning_budget_tokens": 256,
}


def is_qwen36(model: object) -> bool:
    return "qwen3.6" in str(model or "").lower()


def uses_qwen_tools(engine) -> bool:
    return (is_qwen36(getattr(engine, "model_name", ""))
            or getattr(engine.context, "tool_protocol", None) == "qwen3")


def _has_visible_answer(content_parts: list[str]) -> bool:
    """Match pixie_core's handling of inline Qwen <think> content."""
    content = "".join(content_parts)
    content = re.sub(r"<think[^>]*>?.*?</think[^>]*>?", "", content, flags=re.DOTALL)
    content = re.sub(r"<think[^>]*>.*$", "", content, flags=re.DOTALL)
    return bool(content.strip())


def _complete_tool_calls(chunks: list[dict]) -> bool:
    """Validate accumulated native calls before allowing the core to execute them."""
    calls = {}
    for chunk in chunks:
        for choice in chunk.get("choices", []):
            for call in (choice.get("delta") or {}).get("tool_calls") or []:
                parts = calls.setdefault(call["index"], {"name": "", "arguments": ""})
                function = call.get("function") or {}
                parts["name"] += function.get("name") or ""
                parts["arguments"] += function.get("arguments") or ""
    if not calls:
        return False
    for parts in calls.values():
        if not parts["name"]:
            return False
        try:
            arguments = json.loads(parts["arguments"])
        except (TypeError, ValueError):
            return False
        if not isinstance(arguments, dict):
            return False
    return True


def prepare_server(server: dict) -> dict:
    """Give a local Qwen server time to prefill a large prompt."""
    if not is_qwen36(server.get("model")) and server.get("model") != "pixylph-moe":
        return server
    prepared = dict(server)
    prepared.setdefault("read_idle_timeout", 120.0)
    return prepared


def install_sampling_profile(core) -> None:
    """Register Qwen without changing the existing Gemma or default profiles."""
    try:
        engine_module = import_module(f"{core.__name__}.engine")
    except (AttributeError, ImportError):
        return
    profiles = getattr(engine_module, "SAMPLING_PROFILES", None)
    if not isinstance(profiles, dict) or "qwen3.6" in profiles:
        return
    # The shared engine picks the first substring match. A specific Qwen3.6
    # profile must come before any future generic "qwen3" profile.
    existing = list(profiles.items())
    profiles.clear()
    profiles["qwen3.6"] = dict(QWEN36_CODING_PROFILE)
    profiles.update(existing)


def configure_engine(engine, server: dict) -> None:
    """Keep native tool history and bound long Qwen reasoning per request."""
    if server.get("model") == "pixylph-moe":
        _configure_pixylph(engine, server)
        return
    if not is_qwen36(server.get("model")):
        return

    engine.context.supports_tool_role = True
    backend = engine.context.llm
    completion = backend.create_chat_completion

    @wraps(completion)
    def bounded_completion(*args, **kwargs):
        if kwargs.get("thinking_budget_tokens") is None:
            try:
                max_tokens = int(kwargs.get("max_tokens") or 8192)
            except (TypeError, ValueError):
                max_tokens = 8192
            # Leave at least half the generation room for an answer or tool call.
            kwargs["thinking_budget_tokens"] = min(2048, max(1, max_tokens // 2))
        # A reasoning-only length stop otherwise enters pixie_core's generic
        # continuation loop, which can repeat the same empty answer eight times.
        forwarded_any_chunk = False
        for attempt in range(2):
            content_parts = []
            forwarded_content_parts = []
            saw_tool_calls = False
            buffered_tool_chunks = []
            truncated_without_answer = False
            truncated_tool_call = False
            tool_finish_reason = None
            response = completion(*args, **kwargs)
            try:
                for chunk in response:
                    if not isinstance(chunk, dict) or chunk.get("__llm_error__"):
                        yield chunk
                        return
                    for choice in chunk.get("choices", []):
                        delta = choice.get("delta") or {}
                        if delta.get("content"):
                            content_parts.append(delta["content"])
                        saw_tool_calls = saw_tool_calls or bool(delta.get("tool_calls"))
                        if saw_tool_calls and choice.get("finish_reason"):
                            tool_finish_reason = choice["finish_reason"]
                        if choice.get("finish_reason") == "length":
                            # Even syntactically complete JSON is not a completed
                            # tool call when the server reports token exhaustion.
                            # pixie_core would otherwise execute partial arguments.
                            truncated_tool_call = saw_tool_calls
                            truncated_without_answer = (
                                not saw_tool_calls and not _has_visible_answer(content_parts)
                            )
                    if saw_tool_calls:
                        # Do not expose a partial call to pixie_core. Its stream
                        # accumulator has no reset operation for a retry.
                        if not forwarded_any_chunk:
                            # A tool-only stream must still end core's prefill
                            # timer when the first server chunk arrives.
                            yield {"choices": [{"delta": {}, "finish_reason": None}]}
                            forwarded_any_chunk = True
                        buffered_tool_chunks.append(chunk)
                    elif not truncated_without_answer:
                        yield chunk
                        forwarded_any_chunk = True
                        forwarded_content_parts.extend(
                            (choice.get("delta") or {}).get("content") or ""
                            for choice in chunk.get("choices", [])
                        )
                    if truncated_without_answer or truncated_tool_call:
                        break
            finally:
                close = getattr(response, "close", None)
                if callable(close):
                    close()

            if truncated_tool_call:
                if (attempt == 0 and not _has_visible_answer(forwarded_content_parts)
                        and kwargs["thinking_budget_tokens"] != 1
                        and getattr(backend, "_thinking_budget_supported", None) is not False):
                    kwargs = {**kwargs, "thinking_budget_tokens": 1}
                    continue
                reason = ("Qwen3.6 のツール呼び出しが生成上限で中断されたため、実行しませんでした。"
                          "出力上限を増やすか再試行してください。")
                yield {"choices": [{"delta": {"content": f"\n(API Error: {reason})"},
                                     "finish_reason": "error"}],
                       "__llm_error__": reason}
                return
            if saw_tool_calls:
                if tool_finish_reason not in {"tool_calls", "stop"} or not _complete_tool_calls(buffered_tool_chunks):
                    reason = "Qwen3.6 から不完全なツール呼び出しが返されたため、実行しませんでした。"
                    yield {"choices": [{"delta": {"content": f"\n(API Error: {reason})"},
                                         "finish_reason": "error"}],
                           "__llm_error__": reason}
                    return
                yield from buffered_tool_chunks
                return
            if not truncated_without_answer:
                return
            if (attempt == 0 and kwargs["thinking_budget_tokens"] != 1
                    and getattr(backend, "_thinking_budget_supported", None) is not False):
                kwargs = {**kwargs, "thinking_budget_tokens": 1}
                continue

            reason = ("Qwen3.6 が回答やツール呼び出しを出す前に生成上限に達しました。"
                      "サーバーの推論予算設定を確認してください。")
            yield {"choices": [{"delta": {"content": f"\n(API Error: {reason})"},
                                 "finish_reason": "error"}],
                   "__llm_error__": reason}
            return

    backend.create_chat_completion = bounded_completion


def _configure_pixylph(engine, server: dict) -> None:
    """Use Pixylph's native tool API and preserve supported sampling settings."""
    engine.context.supports_tool_role = True
    engine.context.tool_protocol = "qwen3"
    engine.context.native_tool_calls_only = True
    backend = engine.context.llm
    completion = backend.create_chat_completion
    limit = int(server.get("max_tokens") or 4096)
    if limit <= 0:
        raise ValueError("Pixylph max_tokens must be positive")
    backend.read_idle_timeout = float(server.get("read_idle_timeout") or 120.0)

    @wraps(completion)
    def native_completion(messages, **kwargs):
        kwargs["max_tokens"] = min(int(kwargs.get("max_tokens") or limit), limit)
        kwargs.setdefault("temperature", 0.0)
        # Thinking is disabled; sampling and stop settings are supported.
        # Keep tools, tool_choice and the original structured history intact.
        for key in ("thinking_budget_tokens", "reasoning_effort"):
            kwargs[key] = None
        return completion(messages, **kwargs)

    backend.create_chat_completion = native_completion
