"""Small, per-model adjustments for the shared pixie_core engine."""

from __future__ import annotations

from functools import wraps
from importlib import import_module


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


def prepare_server(server: dict) -> dict:
    """Give a local Qwen server time to prefill a large prompt."""
    if not is_qwen36(server.get("model")):
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
        return completion(*args, **kwargs)

    backend.create_chat_completion = bounded_completion
