"""/api/mode（モード切替+ワークスペース永続化）と note 系サイドカー API のテスト。

TestClient は startup イベントを走らせない（with を使わない）ため、AWP bootstrap や
LLM 接続は不要。エンジン依存の /api/chat 経路はここでは扱わない（手動スモーク対象）。
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, mode  # noqa: E402
from app.main import app  # noqa: E402

# verify_origin（DNS リバインディング対策）が testserver を弾くため、許可済みホストで叩く
client = TestClient(app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    """config.WORKSPACE を一時フォルダへ差し替える（サイドカーを実 workspace に書かない）。"""
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    return tmp_path


# --- /api/mode -----------------------------------------------------------------

def test_mode_default_is_code(workspace):
    r = client.get("/api/mode")
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "code"
    assert set(body["modes"]) == {"note", "code", "plan"}  # plan の詳細は test_plan_mode.py
    assert body["features"]["approval"] is True
    assert body["features"]["edit_blocks"] is False
    assert body["features"]["sessions"] == "multi"


def test_mode_switch_persists_to_sidecar(workspace):
    r = client.post("/api/mode", json={"mode": "note"})
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "note"
    assert body["features"]["approval"] is False
    assert body["features"]["edit_blocks"] is True
    assert body["features"]["mdflow"] is True
    assert body["features"]["sessions"] == "single"

    sidecar = workspace / mode.SIDECAR_NAME
    assert sidecar.exists()
    assert json.loads(sidecar.read_text(encoding="utf-8"))["last_mode"] == "note"

    # GET が永続化された値を返す（起動時の last_mode 復元と同じ読み取り経路）
    assert client.get("/api/mode").json()["mode"] == "note"

    # code へ戻す
    assert client.post("/api/mode", json={"mode": "code"}).json()["mode"] == "code"
    assert json.loads(sidecar.read_text(encoding="utf-8"))["last_mode"] == "code"


def test_mode_invalid_is_400(workspace):
    r = client.post("/api/mode", json={"mode": "hack"})
    assert r.status_code == 400


def test_mode_broken_sidecar_falls_back_to_default(workspace):
    (workspace / mode.SIDECAR_NAME).write_text("{broken json", encoding="utf-8")
    assert client.get("/api/mode").json()["mode"] == "code"


# --- /api/notes（付箋サイドカー）------------------------------------------------

def test_notes_roundtrip(workspace):
    assert client.get("/api/notes", params={"path": "a.md"}).json() == {"notes": []}
    notes = [{"line": 3, "text": "ここ直す"}]
    r = client.post("/api/notes", params={"path": "a.md"}, json=notes)
    assert r.status_code == 200 and r.json()["ok"] is True
    assert client.get("/api/notes", params={"path": "a.md"}).json() == {"notes": notes}


# --- /api/chat/history（会話履歴サイドカー）--------------------------------------

def test_chat_history_roundtrip_and_clear(workspace):
    assert client.get("/api/chat/history").json() == {"messages": []}

    msgs = [{"role": "user", "content": "こんにちは"},
            {"role": "assistant", "content": "どうしました？"}]
    r = client.post("/api/chat/history", json={"messages": msgs})
    assert r.status_code == 200
    assert r.json()["messages"] == msgs
    assert client.get("/api/chat/history").json()["messages"] == msgs

    r = client.delete("/api/chat/history")
    assert r.status_code == 200 and r.json()["ok"] is True
    assert client.get("/api/chat/history").json() == {"messages": []}


def test_chat_history_rejects_bad_role(workspace):
    r = client.post("/api/chat/history",
                    json={"messages": [{"role": "system", "content": "x"}]})
    assert r.status_code == 422  # Literal["user","assistant"] 以外は保存させない
