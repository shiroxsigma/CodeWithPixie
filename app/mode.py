"""モード切替（Note / Code）と最終使用モードの永続化（Stage C）。

モードは「そのワークスペースで前回使っていたもの」なので、アプリ設定ではなく
ワークスペースのサイドカー `.pixie_workspace.json` に `{"last_mode": "note"}` として
随伴させる。記録が無いワークスペースでは config の `default_mode`（既定 "code"）。

POST /api/mode はサイドカー更新に加えて登録済みのリセットフック（該当エンジン
セッションの破棄。main.py が起動時に登録する）を呼ぶ — 旧モードの LLM 文脈を
新モードへ持ち越さないため。
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import config, extract
from .config import settings
from .note_api import _load_sidecar, _save_sidecar

VALID_MODES = ("code", "note")
SIDECAR_NAME = ".pixie_workspace.json"

router = APIRouter()

#: モード切替時に呼ぶコールバック（main.py が Note/Code セッションのリセットを登録する）。
_reset_hooks: list = []


def register_reset_hook(fn) -> None:
    _reset_hooks.append(fn)


def _sidecar() -> Path:
    """ワークスペースのサイドカー。ワークスペース切替と一緒に切り替わる。"""
    return config.WORKSPACE / SIDECAR_NAME


def current_mode() -> str:
    """現在モード = ワークスペースの last_mode、無ければ config の default_mode。

    不正値はすべて "code" に倒す（既存の Code 機能が常に動く安全側）。"""
    mode = _load_sidecar(_sidecar()).get("last_mode")
    if mode in VALID_MODES:
        return mode
    default = settings.default_mode
    return default if default in VALID_MODES else "code"


def _save_last_mode(mode: str) -> None:
    """last_mode をサイドカーへ書く（他のキーは保持するマージ書き込み）。"""
    data = _load_sidecar(_sidecar())
    data["last_mode"] = mode
    _save_sidecar(_sidecar(), data)


def _features(mode: str) -> dict:
    """フロント（C-3）がモード別 UI を出し分けるための機能フラグ。"""
    note = mode == "note"
    return {
        "approval": not note,          # ツール実行の承認バー（Code のみ）
        "edit_blocks": note,           # search/replace → 差分プレビュー → クリック反映（Note のみ）
        "mdflow": note,                # mdflow プレビュー・警告（Note のみ）
        "sessions": "single" if note else "multi",  # チャットセッションの方針
        "copilot": settings.copilot_enabled,
        # Office 抽出可能な形式（フロントがハードコードしなくて済むよう公開）
        "extract_exts": sorted(extract.SUPPORTED_EXTS),
    }


def _payload() -> dict:
    mode = current_mode()
    return {
        "mode": mode,
        "modes": list(VALID_MODES),
        "default_mode": settings.default_mode,
        "workspace": str(config.WORKSPACE),
        "features": _features(mode),
    }


class ModeReq(BaseModel):
    mode: str


@router.get("/api/mode")
def api_mode_get():
    """現在モードと機能フラグを返す（トップバーのモードバッジ・UI 出し分け用）。"""
    return _payload()


@router.post("/api/mode")
def api_mode_set(req: ModeReq):
    """モードを切り替える: サイドカー更新 + 該当エンジンセッションのリセット。"""
    mode = (req.mode or "").strip().lower()
    if mode not in VALID_MODES:
        raise HTTPException(400, f"不明なモードです: {req.mode}（note | code）")
    changed = mode != current_mode()
    _save_last_mode(mode)
    if changed:
        # 旧モードの LLM 文脈・ツールプロファイルを持ち越さない（次ターンで再生成）。
        for fn in _reset_hooks:
            try:
                fn()
            except Exception:  # noqa: BLE001 - 片方のリセット失敗で切替自体は止めない
                import logging
                logging.getLogger(__name__).exception("mode reset hook failed")
    return _payload()
