"""LAN 公開用の認証（app/auth.py + app/main.py のゲート）のテスト。

契約:
- 秘密（auth_password / auth_token）が未設定なら従来どおり全透過（ローカル専用動作）。
- 設定時は /api/* が 401、ページは /login へ 302、/login と /static は無認証で到達可。
- ログイン成功 → 署名クッキーで以降の API が通る。Bearer ヘッダも通る。
- 偽造・期限切れクッキーは 401。外部 Host は認証以前に 403（DNS リバインディング対策）。
- 起動ガード: 認証なし＋外部バインドは拒否（skip_auth_guard で強制可）。
"""
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import auth, config, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def auth_on(monkeypatch):
    """パスワード認証を有効化（テスト後にもとへ戻る）。"""
    monkeypatch.setattr(config.settings, "auth_password", "pw-secret")
    monkeypatch.setattr(config.settings, "auth_token", "tok-secret")
    return config.settings


def test_disabled_passthrough():
    """秘密が未設定（既定）なら認証ゲートは素通し。"""
    assert config.settings.auth_password == ""
    assert config.settings.auth_token == ""
    r = client.get("/api/status")
    assert r.status_code == 200


def test_api_requires_login(auth_on):
    r = client.get("/api/status")
    assert r.status_code == 401


def test_root_redirects_to_login(auth_on):
    r = client.get("/", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == "/login"


def test_login_page_and_static_reachable_without_auth(auth_on):
    page = client.get("/login")
    assert page.status_code == 200
    assert "password" in page.text
    # ログイン画面の描画に要る静的ファイルは無認証で引ける
    assert client.get("/static/js/app.js").status_code == 200
    # favicon も無認証（ブラウザが /favicon.ico を勝手に取りに来て 404/302 を出さないように）
    assert client.get("/favicon.ico").status_code == 200


def test_login_wrong_secret(auth_on):
    r = client.post("/api/login", json={"secret": "nope"})
    assert r.status_code == 401


def test_login_flow_with_cookie(auth_on):
    fresh = TestClient(main.app, base_url="http://127.0.0.1")
    assert fresh.get("/api/status").status_code == 401
    r = fresh.post("/api/login", json={"secret": "pw-secret"})
    assert r.status_code == 200
    assert auth.COOKIE_NAME in fresh.cookies
    # クッキー保持後の呼び出しは通る
    assert fresh.get("/api/status").status_code == 200


def test_login_accepts_token_too(auth_on):
    fresh = TestClient(main.app, base_url="http://127.0.0.1")
    r = fresh.post("/api/login", json={"secret": "tok-secret"})
    assert r.status_code == 200
    assert fresh.get("/api/status").status_code == 200


def test_bearer_header(auth_on):
    ok = client.get("/api/status", headers={"Authorization": "Bearer tok-secret"})
    assert ok.status_code == 200
    bad = client.get("/api/status", headers={"Authorization": "Bearer wrong"})
    assert bad.status_code == 401


def test_forged_cookie_rejected(auth_on):
    fresh = TestClient(main.app, base_url="http://127.0.0.1")
    fresh.cookies.set(auth.COOKIE_NAME, "99999999999.deadbeef")
    assert fresh.get("/api/status").status_code == 401


def test_expired_cookie_rejected(auth_on):
    past = int(time.time()) - 10
    value = f"{past}.{auth._sign(past)}"  # 署名は正しいが期限切れ
    fresh = TestClient(main.app, base_url="http://127.0.0.1")
    fresh.cookies.set(auth.COOKIE_NAME, value)
    assert fresh.get("/api/status").status_code == 401


def test_forbidden_host_blocked_regardless_of_auth(auth_on):
    evil = TestClient(main.app, base_url="http://evil.example")
    # 認証より先に Host 検証が走る（401 ではなく 403）
    assert evil.get("/api/status").status_code == 403


def test_startup_guard(monkeypatch):
    # 外部バインド＋認証なし → 拒否
    monkeypatch.setattr(config.settings, "host", "0.0.0.0")
    monkeypatch.setattr(config.settings, "auth_password", "")
    monkeypatch.setattr(config.settings, "auth_token", "")
    monkeypatch.setattr(config.settings, "skip_auth_guard", False)
    assert main.startup_guard() is not None

    # 認証あり → 通る
    monkeypatch.setattr(config.settings, "auth_password", "pw")
    assert main.startup_guard() is None

    # 強制フラグ → 通る（非推奨だが明示操作）
    monkeypatch.setattr(config.settings, "auth_password", "")
    monkeypatch.setattr(config.settings, "skip_auth_guard", True)
    assert main.startup_guard() is None

    # loopback バインドなら認証なしでも通る（従来動作）
    monkeypatch.setattr(config.settings, "host", "127.0.0.1")
    monkeypatch.setattr(config.settings, "skip_auth_guard", False)
    assert main.startup_guard() is None
