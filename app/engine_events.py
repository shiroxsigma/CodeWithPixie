"""AWP/CWP間のSSEイベントを後方互換の型付き契約へ正規化する。"""
from __future__ import annotations

import re

SCHEMA_VERSION = 1

_TOOL_LINE = re.compile(r"^(?:🔧|🔍)\s*([A-Za-z_][A-Za-z0-9_]*)")


def status_metadata(text: str) -> dict:
    """旧来のstatus文字列から、UIが利用する安定メタデータを抽出する。"""
    value = str(text or "").strip()
    lower = value.lower()
    if "prefill" in lower or value.startswith("⏳"):
        return {"category": "phase", "phase": "prefill"}
    if "thinking..." in lower or value.startswith("🧠"):
        return {"category": "phase", "phase": "thinking"}

    tool = _TOOL_LINE.match(value)
    if tool:
        return {"category": "tool", "tool": tool.group(1)}
    if value.startswith(("⚠", "[Warning]", "[警告]", "警告:")):
        return {"category": "warning"}
    if "changeset" in lower:
        return {"category": "changeset"}
    if any(word in value for word in ("受け入れ条件", "整合性検査", "検証")):
        return {"category": "validation"}
    if value.startswith(("[System]", "[システム")) or "中断しました" in value:
        return {"category": "system"}
    if value.startswith("✅"):
        return {"category": "success"}
    return {"category": "progress"}


def normalize_event(event: dict, *, turn_id: int | None = None,
                    sequence: int | None = None) -> dict:
    """既存フィールドを維持したままschema/category/相関情報を補う。"""
    normalized = dict(event)
    normalized.setdefault("schema_version", SCHEMA_VERSION)
    if turn_id:
        normalized.setdefault("turn_id", int(turn_id))
    if sequence is not None:
        normalized.setdefault("sequence", int(sequence))

    event_type = normalized.get("type")
    if event_type == "status":
        for key, value in status_metadata(normalized.get("text", "")).items():
            normalized.setdefault(key, value)
    elif event_type in {"approval", "workset", "files_changed", "compacted", "error",
                        "turn_metrics"}:
        normalized.setdefault("category", event_type)
    return normalized
