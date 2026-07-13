"""CodeWithPixie: FastAPI 本体。

NWP の Web 骨格（静的フロント配信・ファイル API・SSE チャット）を流用しつつ、
チャットは AWP エンジンを駆動する自律エージェント（app.engine_adapter）に置き換える。
1プロセス1セッション。ワークスペースは起動時固定。
"""
from __future__ import annotations

import asyncio
import json
import threading

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, files, patch, search
from .config import settings
from .engine_adapter import AgentSession

BASE = Path(__file__).resolve().parent.parent
STATIC = BASE / "static"

app = FastAPI(title="CodeWithPixie")

ALLOWED_HOSTS = {"127.0.0.1", "localhost", settings.host}

# 1プロセス1セッション。startup で構築する。
_session: AgentSession | None = None
_session_error: str = ""


def get_session() -> AgentSession:
    if _session is None:
        raise HTTPException(503, f"エンジン未初期化: {_session_error or 'starting...'}")
    return _session


@app.on_event("startup")
def _startup() -> None:
    global _session, _session_error
    try:
        server = config.load_servers()[0]
        _session = AgentSession(config.AWP_SRC, config.WORKSPACE, server)
        print(f"[CWP] engine ready: model={_session.model_name or '(unset)'} "
              f"tools={_session.tool_count} workspace={config.WORKSPACE}")
    except Exception as e:  # noqa: BLE001 - 起動失敗でもサーバは上げ、/api/status で理由を出す
        _session_error = f"{type(e).__name__}: {e}"
        print(f"[CWP][ERROR] engine init failed: {_session_error}")


@app.middleware("http")
async def verify_origin(request: Request, call_next):
    """DNS リバインディング & CSRF 対策: ローカル以外の Host / Origin を拒否する。"""
    host = request.headers.get("host", "").split(":")[0].lower()
    if host not in ALLOWED_HOSTS:
        return JSONResponse({"detail": "forbidden host"}, status_code=403)
    # 破壊操作を解放し得る POST は Origin も検証（承認/中断/書込を外部ページから叩かせない）。
    if request.method == "POST":
        origin = request.headers.get("origin")
        if origin:
            from urllib.parse import urlparse
            if urlparse(origin).hostname not in ALLOWED_HOSTS:
                return JSONResponse({"detail": "forbidden origin"}, status_code=403)
    return await call_next(request)


# --- モデル -------------------------------------------------------------------
class SaveReq(BaseModel):
    path: str
    content: str


class FsCreateReq(BaseModel):
    path: str
    kind: str = "file"


class FsRenameReq(BaseModel):
    src: str
    dst: str


class FsDeleteReq(BaseModel):
    path: str


class ChatReq(BaseModel):
    message: str


class ApproveReq(BaseModel):
    id: int
    approve: bool = True
    override: str | None = None


class PatchEdit(BaseModel):
    search: str
    replace: str


class PatchReq(BaseModel):
    base: str
    edits: list[PatchEdit]


# --- ファイル API -------------------------------------------------------------
@app.get("/api/files")
def api_files():
    return {"files": files.list_files(), "root": str(config.WORKSPACE)}


@app.get("/api/file")
def api_read(path: str):
    try:
        return {"path": path, "content": files.read_file(path)}
    except FileNotFoundError:
        raise HTTPException(404, "not found")
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/file")
def api_write(req: SaveReq):
    try:
        files.write_file(req.path, req.content)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/fs/create")
def api_fs_create(req: FsCreateReq):
    try:
        files.create(req.path, req.kind)
        return {"ok": True}
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))


@app.post("/api/fs/rename")
def api_fs_rename(req: FsRenameReq):
    try:
        files.rename(req.src, req.dst)
        return {"ok": True}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))


@app.post("/api/fs/delete")
def api_fs_delete(req: FsDeleteReq):
    try:
        files.delete(req.path)
        return {"ok": True}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))


@app.get("/api/search")
def api_search(q: str):
    return {"results": search.search(q)}


@app.post("/api/patch")
def api_patch(req: PatchReq):
    """search/replace 提案を base へ適用計算する（ファイルには書かない）。手動レビュー用。"""
    edits = [{"search": e.search, "replace": e.replace} for e in req.edits]
    return patch.apply_edits(req.base, edits)


# --- エージェント制御 ----------------------------------------------------------
@app.get("/api/status")
def api_status():
    if _session is None:
        return {"ready": False, "error": _session_error, "workspace": str(config.WORKSPACE)}
    return {
        "ready": True,
        "workspace": str(config.WORKSPACE),
        "model": _session.model_name or "(unset)",
        "tools": _session.tool_count,
        "busy": _session.busy.locked(),
    }


def _sse(ev: dict) -> str:
    return f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
async def api_chat(req: ChatReq):
    sess = get_session()
    if not req.message.strip():
        raise HTTPException(400, "空のメッセージです。")
    # 単一セッション: 実行中なら 409（Lock で構造的に保証）。
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "エージェントは別のターンを実行中です。")

    q: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def emit(ev: dict) -> None:
        # worker スレッド → イベントループへ安全に受け渡し。
        loop.call_soon_threadsafe(q.put_nowait, ev)

    def worker() -> None:
        try:
            sess.run_turn(req.message, emit, settings.approval_timeout)
        finally:
            emit({"type": "__end__"})
            sess.busy.release()

    threading.Thread(target=worker, daemon=True).start()

    async def gen():
        done = False
        try:
            while True:
                ev = await q.get()
                if ev.get("type") == "__end__":
                    done = True
                    yield _sse({"type": "done"})
                    break
                yield _sse(ev)
        finally:
            if not done:
                # クライアント切断 → 協調キャンセルで worker を解放（Lock 専有を防ぐ）。
                sess.cancel()

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/approve")
def api_approve(req: ApproveReq):
    ok = get_session().resolve_approval(req.id, req.approve, req.override)
    return {"ok": ok}


@app.post("/api/interrupt")
def api_interrupt():
    get_session().cancel()
    return {"ok": True}


# --- 静的フロント -------------------------------------------------------------
@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")


def run() -> None:
    import uvicorn

    print(f"CodeWithPixie -> http://{settings.host}:{settings.port}  (workspace: {config.WORKSPACE})")
    # 注意: reload はワーカースレッド/グローバル状態と相性が悪いので使わない（監査指摘）。
    uvicorn.run(app, host=settings.host, port=settings.port)


if __name__ == "__main__":
    run()
