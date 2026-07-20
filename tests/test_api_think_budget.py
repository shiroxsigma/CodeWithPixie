"""思考許容時間（⚙️ 設定 → /api/settings → pixie_core API 1.5）のテスト。

エンジン（pixie_core）は起動していないので、engine_adapter.apply_think_budget は
_core is None で早期 return する。ここで見るのは Web 層の契約:
- GET /api/settings が現在値と上下限を返す
- POST で永続化され、範囲外は 400
- 思考許容時間だけの更新ではセッションを破棄しない（会話文脈を失わない）
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, engine_adapter, main  # noqa: E402
from app.config import settings  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture(autouse=True)
def isolate_config(tmp_path, monkeypatch):
    """config.json への書き込みを一時ファイルへ逃がし、設定値も元に戻す。"""
    monkeypatch.setattr(config, "CONFIG_JSON", tmp_path / "config.json")
    monkeypatch.setattr(settings, "think_budget_sec", settings.think_budget_sec)
    yield


def test_get_settings_returns_budget_and_bounds():
    body = client.get("/api/settings").json()
    assert body["think_budget_sec"] == settings.think_budget_sec
    assert body["think_budget_min"] == config.THINK_BUDGET_MIN
    assert body["think_budget_max"] == config.THINK_BUDGET_MAX


def test_post_updates_and_persists():
    body = client.post("/api/settings", json={"think_budget_sec": 300}).json()
    assert body["think_budget_sec"] == 300
    assert settings.think_budget_sec == 300
    assert client.get("/api/settings").json()["think_budget_sec"] == 300


@pytest.mark.parametrize("bad", [1, 9, 100000])
def test_post_rejects_out_of_range(bad):
    before = settings.think_budget_sec
    r = client.post("/api/settings", json={"think_budget_sec": bad})
    assert r.status_code == 400
    assert settings.think_budget_sec == before


def test_budget_only_update_keeps_sessions(monkeypatch):
    """モデル/サーバを変えていないので Note セッションは破棄されない。"""
    called = []
    monkeypatch.setattr(engine_adapter, "reset_note_session", lambda: called.append("reset"))
    client.post("/api/settings", json={"think_budget_sec": 120})
    assert called == []


def test_stream_timeout_follows_budget():
    """思考を延ばしたら LLM ストリームの打ち切り秒も追随する（既定 180 を下回らない）。"""
    assert engine_adapter.stream_timeout_sec(90) == 180.0
    assert engine_adapter.stream_timeout_sec(600) == 660.0
