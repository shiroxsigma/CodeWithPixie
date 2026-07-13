"""CodeWithPixie: FastAPI 本体。

NWP の Web 骨格（静的フロント配信・ファイル API・SSE チャット）を流用しつつ、
チャットは AWP エンジンを駆動する自律エージェント（app.engine_adapter）に置き換える。
複数セッション並行・セッション別 workspace 対応。作業フォルダは実行中に切替可能。
"""
from __future__ import annotations

import asyncio
import json
import os
import string
import threading

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, copilot, engine_adapter, files, patch, search
from .config import settings
from .engine_adapter import AgentSession

BASE = Path(__file__).resolve().parent.parent
STATIC = BASE / "static"

app = FastAPI(title="CodeWithPixie")

ALLOWED_HOSTS = {"127.0.0.1", "localhost", settings.host}

MAX_SESSIONS = 8  # 1プロセスで同時に保持する会話（セッション）数の上限


class SessionManager:
    """会話ごとに独立した AgentSession（＝pixie_core.Engine）を保持する。

    別セッションのターンは別スレッドで並行実行され、state_board / workspace は pixie_core 側の
    ContextVar で分離される。同一セッション内では busy ロックで直列化する。
    セッションは作成時の「現在の作業フォルダ(config.WORKSPACE)」と「アクティブなサーバ」に束縛
    される（フォルダ/モデルを切り替えても既存セッションは維持、以降の新規セッションに反映）。
    """

    def __init__(self, core, max_sessions: int = MAX_SESSIONS):
        self._core = core
        self._max = max_sessions
        self._sessions: dict[str, AgentSession] = {}
        self._lock = threading.Lock()

    def get_or_create(self, sid: str) -> AgentSession:
        with self._lock:
            s = self._sessions.get(sid)
            if s is None:
                if len(self._sessions) >= self._max:
                    raise HTTPException(429, f"セッション上限({self._max})に達しました。")
                # 作成時点の作業フォルダ・アクティブサーバに束縛する。
                s = AgentSession(self._core, config.active_server(), str(config.WORKSPACE))
                self._sessions[sid] = s
            return s

    def get(self, sid: str) -> AgentSession | None:
        return self._sessions.get(sid)

    def drop(self, sid: str) -> None:
        with self._lock:
            self._sessions.pop(sid, None)

    def count(self) -> int:
        return len(self._sessions)


# startup で構築するプロセス共有のマネージャ。
_manager: SessionManager | None = None
_engine_error: str = ""
_tool_count: int = 0


@app.on_event("startup")
def _startup() -> None:
    global _manager, _engine_error, _tool_count
    try:
        core = engine_adapter.bootstrap(config.AWP_SRC)
        _manager = SessionManager(core)
        _tool_count = core.tool_count()
        print(f"[CWP] engine ready: model={config.active_server().get('model')} tools={_tool_count} "
              f"workspace={config.WORKSPACE} (multi-session, max={MAX_SESSIONS})")
    except Exception as e:  # noqa: BLE001 - 起動失敗でもサーバは上げ、/api/status で理由を出す
        _engine_error = f"{type(e).__name__}: {e}"
        print(f"[CWP][ERROR] engine init failed: {_engine_error}")


def _require_manager() -> SessionManager:
    if _manager is None:
        raise HTTPException(503, f"エンジン未初期化: {_engine_error or 'starting...'}")
    return _manager


def _valid_sid(sid: str) -> str:
    sid = (sid or "").strip()
    if not sid or len(sid) > 64:
        raise HTTPException(400, "session_id が不正です。")
    return sid


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
    session_id: str


class ApproveReq(BaseModel):
    id: int
    session_id: str
    approve: bool = True
    override: str | None = None


class InterruptReq(BaseModel):
    session_id: str


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
    if _manager is None:
        return {"ready": False, "error": _engine_error, "workspace": str(config.WORKSPACE)}
    srv = config.active_server()
    return {
        "ready": True,
        "workspace": str(config.WORKSPACE),
        "model": srv.get("model") or "(unset)",
        "server": srv.get("name") or srv.get("base_url"),
        "tools": _tool_count,
        "sessions": _manager.count(),
        "max_sessions": MAX_SESSIONS,
    }


# --- 作業フォルダ（ファイルブラウザ＋新規セッションの workspace） ---------------
class WorkspaceReq(BaseModel):
    path: str


@app.post("/api/workspace")
def api_set_workspace(req: WorkspaceReq):
    """作業フォルダを切り替える（フォルダ移動）。以降の新規セッションと file API に反映。"""
    try:
        p = config.set_workspace(req.path)
        return {"ok": True, "workspace": str(p)}
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))


@app.get("/api/workspace/dirs")
def api_workspace_dirs(path: str = ""):
    """フォルダ選択ダイアログ用: 指定ディレクトリの子フォルダ一覧（ドライブ含む）を返す。"""
    entries: list[dict] = []
    drives: list[str] = []
    if os.name == "nt":
        for letter in string.ascii_uppercase:
            root = f"{letter}:\\"
            if os.path.isdir(root):
                drives.append(root)
    base = (path or "").strip()
    cur = ""
    if base:
        try:
            cur = str(Path(base).expanduser().resolve())
            with os.scandir(cur) as it:
                for e in it:
                    try:
                        if e.is_dir() and not e.name.startswith("."):
                            entries.append({"name": e.name, "path": str(Path(cur) / e.name)})
                    except OSError:
                        continue
        except (OSError, ValueError):
            cur = ""
    entries.sort(key=lambda d: d["name"].lower())
    parent = str(Path(cur).parent) if cur else ""
    return {"cwd": cur, "parent": parent, "dirs": entries, "drives": drives,
            "current_workspace": str(config.WORKSPACE)}


# --- モデル/サーバ設定 ---------------------------------------------------------
class SettingsReq(BaseModel):
    active_server: int


@app.get("/api/servers")
def api_servers():
    """設定済みサーバ一覧とアクティブ index を返す（⚙️ 設定用）。"""
    servers = [{"name": s.get("name") or s.get("base_url"),
                "base_url": s.get("base_url"), "model": s.get("model")}
               for s in config.load_servers()]
    return {"servers": servers, "active": config.get_active_server_index()}


@app.post("/api/settings")
def api_settings(req: SettingsReq):
    """アクティブなサーバ（モデル）を切り替える。以降の新規セッションに反映。"""
    try:
        config.set_active_server_index(req.active_server)
        return {"ok": True, "active": config.get_active_server_index()}
    except ValueError as e:
        raise HTTPException(400, str(e))


# --- Copilot 連携（PrayLight 経由）--------------------------------------------
class CopilotEnableReq(BaseModel):
    enabled: bool


@app.get("/api/copilot")
def api_copilot_status():
    """Copilot 連携の on/off と PrayLight の疎通状況（⚙️ 設定表示用）。"""
    return copilot.status()


@app.post("/api/copilot/enable")
def api_copilot_enable(req: CopilotEnableReq):
    """Copilot 連携を on/off する。on の会話では ask_copilot ツールがエージェントに提示される。"""
    config.set_copilot_enabled(req.enabled)
    return copilot.status()


@app.post("/api/copilot/open")
def api_copilot_open():
    """PrayLight のログイン用ブラウザを起動して Copilot を開く（人がそこでログインする）。"""
    if not config.settings.copilot_enabled:
        return {"ok": False, "error": "Copilot 連携が無効です。先にオンにしてください。"}
    err = copilot.open_browser()
    return {"ok": not err, "error": err}


def _sse(ev: dict) -> str:
    return f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
async def api_chat(req: ChatReq):
    manager = _require_manager()
    if not req.message.strip():
        raise HTTPException(400, "空のメッセージです。")
    sess = manager.get_or_create(_valid_sid(req.session_id))
    sess.set_copilot(config.settings.copilot_enabled)  # トグルを次ターンに反映（ask_copilot の提示可否）
    # 同一セッションは直列（別セッションは並行可）。実行中なら 409。
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "このセッションは別のターンを実行中です。")

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
    sess = _require_manager().get(_valid_sid(req.session_id))
    if sess is None:
        raise HTTPException(404, "session not found")
    ok = sess.resolve_approval(req.id, req.approve, req.override)
    return {"ok": ok}


@app.post("/api/interrupt")
def api_interrupt(req: InterruptReq):
    sess = _require_manager().get(_valid_sid(req.session_id))
    if sess is None:
        raise HTTPException(404, "session not found")
    sess.cancel()
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
