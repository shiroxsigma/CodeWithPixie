"""認証: パスワード/トークンでログイン → 署名済みクッキー（LAN 公開用）。

config の ``auth_password`` / ``auth_token`` のどちらかが設定されると有効になる
（両方空なら従来どおり認証なし・ローカル専用）。

- ブラウザ: /login で ``auth_password`` または ``auth_token`` を入力 → 署名クッキー
  （HttpOnly, SameSite=Lax, 30日）。Cookie には有効期限のタイムスタンプと HMAC 署名
  だけが入り、利用者情報は持たない。
- スクリプト: ``Authorization: Bearer <auth_token または auth_password>``。

SECRET は起動ごとに再生成する — **再起動すると全セッション再ログイン**になる。
意図的な設計で、永続鍵をディスクに置かずに済む（ローカルツールには十分）。
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time

from fastapi import Request

from .config import settings

#: 起動ごとに再生成。再起動でセッションが無効化する（＝簡易的な一斉ログアウト）。
SECRET = os.urandom(32)

#: セッション有効期間（秒）。30日 — LAN 内の日常利用で毎日の再ログインを避ける。
SESSION_TTL_SEC = 30 * 86400

COOKIE_NAME = "cwp_session"


def enabled() -> bool:
    """認証が有効か（秘密が1つでも設定されていれば有効）。"""
    return bool(settings.auth_password or settings.auth_token)


def verify_secret(secret: str) -> bool:
    """ログイン入力を受け付けるか。設定済みの秘密のいずれかと一致すればよい
    （パスワードでもトークンでも、片方だけ設定していても両方を兼ねる）。"""
    ok = False
    given = (secret or "").encode("utf-8")
    for ref in (settings.auth_password, settings.auth_token):
        if ref:
            # timing-safe に比較。空同士で一致しないよう ref 側も空は除外済み。
            ok |= hmac.compare_digest(ref.encode("utf-8"), given)
    return ok


def _sign(expires: int) -> str:
    return hmac.new(SECRET, str(expires).encode("ascii"), hashlib.sha256).hexdigest()


def make_cookie_value() -> tuple[str, int]:
    """(クッキー値, max_age秒) を返す。値は "<期限unix秒>.<署名>"。"""
    expires = int(time.time()) + SESSION_TTL_SEC
    return f"{expires}.{_sign(expires)}", SESSION_TTL_SEC


def check_cookie(value: str | None) -> bool:
    """クッキー値が正当（署名一致・期限内）か。"""
    if not value or "." not in value:
        return False
    expires_s, _, sig = value.partition(".")
    try:
        expires = int(expires_s)
    except ValueError:
        return False
    if expires < int(time.time()):
        return False
    return hmac.compare_digest(_sign(expires), sig)


def check_request(request: Request) -> bool:
    """このリクエストが認証済みか（署名クッキー or Bearer ヘッダ）。"""
    if check_cookie(request.cookies.get(COOKIE_NAME)):
        return True
    authz = request.headers.get("authorization", "")
    if authz.startswith("Bearer "):
        return verify_secret(authz[len("Bearer "):].strip())
    return False
