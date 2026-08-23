"""後方互換SSEイベントを型付きメタデータへ正規化する。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engine_events import normalize_event, status_metadata  # noqa: E402


def test_phase_metadata():
    assert status_metadata("⏳ Prefill...") == {"category": "phase", "phase": "prefill"}
    assert status_metadata("✅ Prefill: 1.2s") == {"category": "phase", "phase": "prefill"}
    assert status_metadata("🧠 Thinking...") == {"category": "phase", "phase": "thinking"}


def test_tool_and_result_metadata():
    assert status_metadata("🔧 read_file(path=a.py)") == {
        "category": "tool", "tool": "read_file"}
    assert status_metadata("🔍 grep_search(foo)") == {
        "category": "tool", "tool": "grep_search"}
    assert status_metadata("ChangeSet chg_1 を適用しました") == {"category": "changeset"}
    assert status_metadata("受け入れ条件を検証しました") == {"category": "validation"}
    assert status_metadata("⚠️ 失敗") == {"category": "warning"}


def test_normalize_preserves_payload_and_adds_correlation():
    event = normalize_event(
        {"type": "status", "text": "🔧 read_file(a.py)", "custom": 1},
        turn_id=7,
        sequence=3,
    )
    assert event == {
        "type": "status",
        "text": "🔧 read_file(a.py)",
        "custom": 1,
        "schema_version": 1,
        "turn_id": 7,
        "sequence": 3,
        "category": "tool",
        "tool": "read_file",
    }


def test_explicit_structured_fields_win_over_legacy_parser():
    event = normalize_event({
        "type": "status", "text": "legacy text", "category": "phase", "phase": "verify"})
    assert event["category"] == "phase"
    assert event["phase"] == "verify"


def test_turn_metrics_receive_schema_and_category():
    event = normalize_event(
        {"type": "turn_metrics", "metrics": {"tool_calls": 2}},
        turn_id=9,
        sequence=4,
    )
    assert event == {
        "type": "turn_metrics",
        "metrics": {"tool_calls": 2},
        "schema_version": 1,
        "turn_id": 9,
        "sequence": 4,
        "category": "turn_metrics",
    }
