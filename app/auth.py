"""LAN公開時に使う永続共有トークン認証。"""
from __future__ import annotations

import hmac
import secrets
import sys

from .config import TOKEN_FILE, settings

COOKIE = "cwp_token"
MIN_TOKEN_LEN = 16


def _load_or_create_token() -> str:
    configured = settings.token.strip()
    if configured:
        return configured
    if TOKEN_FILE.exists():
        try:
            saved = TOKEN_FILE.read_text(encoding="utf-8").strip()
        except OSError:
            saved = ""
        if saved:
            return saved
    fresh = secrets.token_urlsafe(32)
    try:
        TOKEN_FILE.write_text(fresh, encoding="utf-8")
    except OSError as exc:
        sys.exit(f"{TOKEN_FILE} にトークンを書き込めません: {exc}")
    return fresh


TOKEN = _load_or_create_token()
if len(TOKEN) < MIN_TOKEN_LEN:
    sys.exit(f"CWPのアクセストークンは{MIN_TOKEN_LEN}文字以上にしてください。")


def ok(candidate: str | None) -> bool:
    return bool(candidate) and hmac.compare_digest(candidate.encode(), TOKEN.encode())
