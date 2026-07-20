"""/api/copilot/read（Note モードの Copilot 会話取り込み）のテスト。

PrayLight の subprocess は呼ばず、copilot.read_conversation をモンキーパッチして
「エンドポイントの契約（enabled ガード・エラー文字列 → ok=False 変換）」だけを検証する。
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import copilot  # noqa: E402
from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app, base_url="http://127.0.0.1")


@pytest.fixture()
def copilot_on(monkeypatch):
    monkeypatch.setattr(settings, "copilot_enabled", True)


def test_read_requires_copilot_enabled(monkeypatch):
    monkeypatch.setattr(settings, "copilot_enabled", False)
    body = client.post("/api/copilot/read").json()
    assert body["ok"] is False
    assert body["transcript"] == ""
    assert "設定" in body["error"]


def test_read_returns_transcript(copilot_on, monkeypatch):
    monkeypatch.setattr(copilot, "read_conversation", lambda: "# 会話\n\nこんにちは")
    body = client.post("/api/copilot/read").json()
    assert body["ok"] is True
    assert body["error"] == ""
    assert body["transcript"].startswith("# 会話")


def test_read_maps_error_string_to_ok_false(copilot_on, monkeypatch):
    monkeypatch.setattr(copilot, "read_conversation", lambda: "エラー: 会話を取得できませんでした。")
    body = client.post("/api/copilot/read").json()
    assert body["ok"] is False
    assert body["transcript"] == ""
    assert body["error"].startswith("エラー")


def test_read_conversation_falls_back_to_cdp(monkeypatch):
    """UIA が失敗したら CDP スクリプトへフォールバックする（両方失敗なら合成エラー）。"""
    calls = []

    def fake_reader(name):
        calls.append(name)
        return "エラー: だめ" if name == "copilot_read_uia.py" else "# CDP から取得"

    monkeypatch.setattr(copilot, "_run_reader", fake_reader)
    assert copilot.read_conversation() == "# CDP から取得"
    assert calls == ["copilot_read_uia.py", "copilot_read.py"]

    monkeypatch.setattr(copilot, "_run_reader", lambda name: "エラー: だめ")
    both = copilot.read_conversation()
    assert both.startswith("エラー")
    assert "UIA" in both and "CDP" in both
