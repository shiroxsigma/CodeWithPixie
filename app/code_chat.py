"""Code モードの会話ログ永続化（ワークスペースのサイドカー `.pixie_code_chat.json`）。

Note モードの .pixie_chat.json と同じ発想だが、Code はセッション（会話）単位で複数持てるので
{session_id: {title, updated_at, messages}} のマップで保存する。書き込みはフロント駆動
（ターン確定ごとに POST /api/code-chat/log）— Note の saveHistory と同じ形。

エンジンの文脈復元（history_replace へのシード）は main.py の /api/code-chat/restore が担う
（SessionManager が必要なので、サイドカーCRUDだけのこのモジュールには置かない）。
"""
from __future__ import annotations

import json
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import config

router = APIRouter()

SIDECAR_NAME = ".pixie_code_chat.json"

#: 1セッションあたりのメッセージ上限（古い側から落とす。文脈の完全復元より
#: 「会話の記録が膨張し続けない」ことを優先。エンジン文脈自体は自動トリム済み）。
MAX_MESSAGES = 400
#: 保存する会話の上限（古い順に消す）。
MAX_SESSIONS = 50
TITLE_CHARS = 40


def _sidecar_path():
    return config.WORKSPACE / SIDECAR_NAME


def load_store() -> dict:
    try:
        return json.loads(_sidecar_path().read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save_store(data: dict) -> None:
    _sidecar_path().write_text(
        json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


class LogReq(BaseModel):
    session_id: str
    user: str = ""
    assistant: str = ""


@router.post("/api/code-chat/log")
def code_chat_log(req: LogReq):
    """1往復を保存（ターン確定ごとにフロントが呼ぶ）。"""
    sid = req.session_id.strip()
    if not sid or len(sid) > 64:
        raise HTTPException(400, "session_id が不正です。")
    if not req.user.strip() and not req.assistant.strip():
        return {"ok": True}  # 空往復は保存しない
    data = load_store()
    entry = data.get(sid)
    if entry is None:
        entry = {"title": "", "updated_at": 0.0, "messages": []}
        data[sid] = entry
    if req.user.strip():
        entry["messages"].append({"role": "user", "content": req.user})
    if req.assistant.strip():
        entry["messages"].append({"role": "assistant", "content": req.assistant})
    entry["messages"] = entry["messages"][-MAX_MESSAGES:]
    if not entry.get("title"):
        first_user = next((m["content"] for m in entry["messages"] if m["role"] == "user"), "")
        entry["title"] = first_user.replace("\n", " ").strip()[:TITLE_CHARS] or "（タイトルなし）"
    entry["updated_at"] = time.time()
    # セッション数の上限（updated_at の古い順に消す）
    if len(data) > MAX_SESSIONS:
        for old in sorted(data, key=lambda k: data[k].get("updated_at", 0))[:len(data) - MAX_SESSIONS]:
            if old != sid:
                del data[old]
    _save_store(data)
    return {"ok": True}


@router.get("/api/code-chat/sessions")
def code_chat_sessions():
    """保存済み会話の一覧（新しい順）。"""
    data = load_store()
    out = [{
        "session_id": sid,
        "title": e.get("title") or "（タイトルなし）",
        "updated_at": e.get("updated_at", 0),
        "messages": len(e.get("messages") or []),
    } for sid, e in data.items()]
    out.sort(key=lambda x: x["updated_at"], reverse=True)
    return {"sessions": out}


@router.get("/api/code-chat/session")
def code_chat_session(session_id: str):
    """1会話のメッセージ列（表示の復元用）。"""
    entry = load_store().get(session_id.strip())
    if entry is None:
        raise HTTPException(404, "会話が見つかりません。")
    return {"session_id": session_id, "title": entry.get("title", ""),
            "messages": entry.get("messages") or []}


class DeleteReq(BaseModel):
    session_id: str


@router.post("/api/code-chat/delete")
def code_chat_delete(req: DeleteReq):
    data = load_store()
    existed = data.pop(req.session_id.strip(), None) is not None
    if existed:
        _save_store(data)
    return {"ok": existed}
