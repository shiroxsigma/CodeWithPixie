"""Observe completion boundaries for the Web UI without changing inference."""
from __future__ import annotations

import re
import time


_READ_TOOLS = frozenset({
    "read_file", "read_files", "get_code_outline", "list_directory", "view_tree",
    "grep_search", "research_code_paths", "analyze_file", "gather_project_info",
})
_PROMISE = re.compile(
    r"(?:確認|取得|調査|解析|読み取り|把握|整理|抽出|説明|解説)(?:していきます|します|する|しますね)[。.!！\s]*$"
    r"|(?:解説|説明)(?:を)?(?:完成させます|できる|できます)[。.!！\s]*$"
    r"|\b(?:I will|I'll|Let me)\s+(?:read|check|inspect|search|explain)\b", re.I,
)


def is_work_report(content: str, tools: set[str]) -> bool:
    """Only short prose is movable; final explanations and edit blocks stay put."""
    text = re.sub(r"<think\b[^>]*>.*?</think\s*>", "", content, flags=re.S).strip()
    if not text or len(text) > 600 or "<think" in text:
        return False
    if re.search(r"(?m)^\s*(?:#{1,6}\s|```|~~~|[-*+]\s|\d+[.)]\s|\|)", text):
        return False
    if "```" in text or "~~~" in text or len(text.splitlines()) > 4:
        return False
    return bool(_PROMISE.search(text)) or bool(tools and tools <= _READ_TOOLS)


class ResponseProgress:
    """Delay boundary publication until the core has flushed its text filter.

    Inference chunks are forwarded unchanged. No extra model requests are made.
    finish() runs before tools, the next request, or the turn-completion event.
    """

    def __init__(self, emit):
        self.emit = emit
        self.sequence = 0
        self.active = None

    def finish(self):
        response, self.active = self.active, None
        if response is None:
            return
        progress = not response["interrupted"] and is_work_report(
            "".join(response["content"]), set(response["tools"].values()))
        self.emit({"type": "response_end", "response_id": response["id"],
                   "progress": progress, "interrupted": response["interrupted"],
                   "has_tool_calls": bool(response["tools"]),
                   "elapsed_sec": round(time.monotonic() - response["started"], 3)})

    def observe(self, completion):
        def observed(*args, **kwargs):
            if not kwargs.get("stream"):
                return completion(*args, **kwargs)
            return observe_stream(*args, **kwargs)

        def observe_stream(*args, **kwargs):
            self.finish()
            self.sequence += 1
            response = {"id": self.sequence, "started": time.monotonic(),
                        "content": [], "tools": {}, "interrupted": True}
            self.active = response
            self.emit({"type": "response_start", "response_id": self.sequence})
            phase = "prefill"
            stream = completion(*args, **kwargs)
            try:
                for chunk in stream:
                    for choice in chunk.get("choices", []) if isinstance(chunk, dict) else []:
                        delta = choice.get("delta") or choice.get("message") or {}
                        text = delta.get("content") or ""
                        response["content"].append(text)
                        for call in delta.get("tool_calls") or []:
                            name = (call.get("function") or {}).get("name")
                            if name:
                                index = call.get("index", 0)
                                response["tools"][index] = response["tools"].get(index, "") + name
                        next_phase = ("thinking" if delta.get("reasoning_content") else
                                      "generating" if delta.get("tool_calls") else
                                      "responding" if text.strip() else phase)
                        if next_phase != phase:
                            phase = next_phase
                            self.emit({"type": "status", "category": "phase", "phase": phase,
                                       "text": "", "response_id": response["id"]})
                        if choice.get("finish_reason"):
                            response["interrupted"] = choice["finish_reason"] in {"error", "length"}
                    yield chunk
            finally:
                close = getattr(stream, "close", None)
                if callable(close):
                    close()
        return observed
