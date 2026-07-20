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
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, copilot, engine_adapter, extract, files, mdflow, mode, note_api, note_prompts, patch, search
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

    def clear(self) -> None:
        """全セッションを協調キャンセルして破棄する（モード切替時のリセット用）。"""
        with self._lock:
            for s in self._sessions.values():
                s.cancel()
            self._sessions.clear()

    def count(self) -> int:
        return len(self._sessions)

    def all(self) -> list[AgentSession]:
        """生きているセッションの一覧（実行中設定を全セッションへ反映する用）。"""
        with self._lock:
            return list(self._sessions.values())


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


class FsOpenReq(BaseModel):
    path: str


class ContextFile(BaseModel):
    path: str
    content: str


class ChatReq(BaseModel):
    message: str
    session_id: str
    current_file: str | None = None  # エディタで開いているファイル（エージェントへのコンテキスト）
    # --- Note モード用（C-3 フロントが送る。Code モードでは未使用・省略可）---
    selection: str = ""                # エディタで選択中のテキスト
    context_files: list[ContextFile] = []  # チェック済みの参考ファイル
    ref_texts: list[ContextFile] = []      # 関連ファイル（テキスト）: context_files と同じ扱い
    history: list[dict] = []               # フロント保持の履歴（セッション新規作成時のシード用）
    current_content: str = ""              # current_file の内容（未保存の編集を含むエディタバッファ）
    attach_files: list[str] = []           # 関連ファイル（バイナリ/外部）の絶対パス: Copilot 添付用


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
    """ファイル内容を返す。Office 系（pptx/docx/xlsx/pdf）は Markdown へ抽出して返す
    （NWP と同じ read 専用変換。Note モードのコンテキストチェックボックスが使う）。
    保存（POST /api/file）側は抽出に対応しない — 抽出結果は元ファイルへ書き戻せない。"""
    try:
        p = files.safe_path(path)
        if p.suffix.lower() in extract.SUPPORTED_EXTS:
            if not p.is_file():
                raise HTTPException(404, "not found")
            # refs/read と同じ上限（画像入り Office ファイルは数十MBが普通）
            if p.stat().st_size > extract.MAX_OFFICE_BYTES:
                raise HTTPException(400, "file too large")
            return {"path": path, "content": extract.extract_text(p), "extracted": True}
        return {"path": path, "content": files.read_file(path), "extracted": False}
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
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))
    # Note モードのサイドカー（付箋・関連ファイル参照）のキーを改名に追従させる（NWP から統合）
    note_api.rewrite_sidecar_keys(req.src, req.dst)
    return {"ok": True}


@app.post("/api/fs/delete")
def api_fs_delete(req: FsDeleteReq):
    try:
        files.delete(req.path)
        return {"ok": True}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))


@app.post("/api/fs/open")
def api_fs_open(req: FsOpenReq):
    """ワークスペース内のファイルを OS の既定アプリで開く（.png や .pdf を実物で見る用）。

    ワークスペースは信頼境界の内側なので、safe_path のサンドボックス（ルート外拒否）で足りる。
    """
    try:
        p = files.safe_path(req.path)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not p.exists():
        raise HTTPException(404, f"ファイルが見つかりません: {req.path}")
    if os.name == "nt":
        os.startfile(str(p))  # noqa: S606 — ローカル専用アプリ、ユーザー起点、ワークスペース内限定
    else:
        import subprocess

        subprocess.Popen(["xdg-open", str(p)])
    return {"ok": True}


@app.get("/api/search")
def api_search(q: str):
    return {"results": search.search(q)}


@app.post("/api/patch")
def api_patch(req: PatchReq):
    """search/replace 提案を base へ適用計算する（ファイルには書かない）。手動レビュー用。

    mdflow の整合性検査付き（NWP から統合）: 編集で「新たに増えた」警告だけを返す
    （元から壊れているノートへの無関係な編集で毎回警告が出るのを防ぐ）。警告のみで
    ブロックはしない — 採否は差分プレビューでユーザーが決める。mermaid/mdflow を
    含まないテキストでは warnings は常に空なので Code モードにも無害。"""
    edits = [{"search": e.search, "replace": e.replace} for e in req.edits]
    r = patch.apply_edits(req.base, edits)
    base_warns = set(mdflow.validate_document(req.base))
    r["mdflow_warnings"] = [w for w in mdflow.validate_document(r["content"])
                            if w not in base_warns]
    return r


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
    except (ValueError, OSError) as e:
        raise HTTPException(400, str(e))
    # Note セッションは旧ワークスペースの内容を文脈に含むため作り直す（次ターンで再生成）
    engine_adapter.reset_note_session()
    return {"ok": True, "workspace": str(p)}


@app.get("/api/workspace/dirs")
def api_workspace_dirs(path: str = "", files: bool = False):
    """フォルダ選択ダイアログ用: 指定ディレクトリの子フォルダ一覧（ドライブ含む）を返す。

    files=true でファイル一覧も返す（Note モードの「＋参照を追加」ダイアログ用。
    省略時は従来どおりフォルダのみ — 既存フロント互換）。"""
    entries: list[dict] = []
    file_entries: list[dict] = []
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
                        if e.name.startswith("."):
                            continue
                        if e.is_dir():
                            entries.append({"name": e.name, "path": str(Path(cur) / e.name)})
                        elif files and e.is_file():
                            file_entries.append({"name": e.name, "path": str(Path(cur) / e.name)})
                    except OSError:
                        continue
        except (OSError, ValueError):
            cur = ""
    entries.sort(key=lambda d: d["name"].lower())
    parent = str(Path(cur).parent) if cur else ""
    resp = {"cwd": cur, "parent": parent, "dirs": entries, "drives": drives,
            "current_workspace": str(config.WORKSPACE)}
    if files:
        file_entries.sort(key=lambda d: d["name"].lower())
        resp["files"] = file_entries
    return resp


# --- モデル/サーバ設定 ---------------------------------------------------------
class SettingsReq(BaseModel):
    active_server: int | None = None
    model: str | None = None
    think_budget_sec: int | None = None   # 思考許容時間（deep 思考の <think> 上限秒）


@app.get("/api/servers")
def api_servers():
    """設定済みサーバ一覧とアクティブ index を返す（⚙️ 設定用）。"""
    servers = [{"name": s.get("name") or s.get("base_url"),
                "base_url": s.get("base_url"), "model": s.get("model")}
               for s in config.load_servers()]
    return {"servers": servers, "active": config.get_active_server_index()}


def _is_chat_capable(model_id: str) -> bool:
    """LM Studio の /v1/models はチャット対象外のファイル（ビジョンプロジェクタ・
    embedding・rerank 等）も混ぜて返す。これらを選ぶとロード失敗（HTTP 400）するので除外。

    LM Studio の標準 OpenAI 互換応答には「チャット可否」フィールドが無いため、
    ファイル名のヒューリスティックで判定する（過不足はあるが主要なロートルを潰す）。"""
    lower = model_id.lower()
    return not any(b in lower for b in (
        "mmproj",          # ビジョンプロジェクタ（本体と対で配布されるがチャット不可）
        "embedding", "-embed",  # text-embedding-*
        "rerank",          # reranker
        "bge-m3",          # BGE-M3 は embed/rerank 兼用でチャット不可のこと多い
    ))


@app.get("/api/models")
async def api_models():
    """アクティブサーバからロード済みモデル一覧を取得（LM Studio の /v1/models）。

    ⚙️設定のモデル選択ドロップダウン用。LM Studio 未起動・モデル未ロード時は空配列を返す
    （フロントは「取得できません」表示にフォールバックする）。
    チャット対象外（mmproj / embedding 等）は _is_chat_capable で除外する。"""
    import httpx
    srv = config.active_server()
    base = (srv.get("base_url") or "").rstrip("/")
    headers = {"Authorization": f"Bearer {srv.get('api_key') or 'lm-studio'}"}
    models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{base}/models", headers=headers)
            r.raise_for_status()
            models = [m["id"] for m in r.json().get("data", [])
                      if m.get("id") and _is_chat_capable(m["id"])]
    except Exception:
        pass  # LM Studio 停止中・タイムアウト等。空配列で返す（フロントが案内する）
    return {"models": models, "current": srv.get("model")}


@app.get("/api/settings")
def api_settings_get():
    """⚙️ 設定画面の現在値（数値系。サーバ/モデルは /api/servers、Copilot は /api/copilot）。"""
    return {
        "active": config.get_active_server_index(),
        "model": config.active_server().get("model"),
        "think_budget_sec": settings.think_budget_sec,
        "think_budget_min": config.THINK_BUDGET_MIN,
        "think_budget_max": config.THINK_BUDGET_MAX,
    }


@app.post("/api/settings")
def api_settings(req: SettingsReq):
    """アクティブなサーバ、モデル、思考許容時間を更新する。

    思考許容時間はセッションを作り直さずに反映できる（プロセス全体の思考上限＋既存
    セッションのストリーム打ち切り秒を書き換えるだけ）ので、下のリセット対象に含めない。"""
    if req.think_budget_sec is not None:
        try:
            v = config.set_think_budget_sec(req.think_budget_sec)
        except ValueError as e:
            raise HTTPException(400, str(e))
        sessions = _manager.all() if _manager is not None else ()
        engine_adapter.apply_think_budget(v, sessions=sessions)
    if req.active_server is not None:
        try:
            config.set_active_server_index(req.active_server)
        except ValueError as e:
            raise HTTPException(400, str(e))
    if req.model is not None and req.model.strip():
        config.set_active_server_model(req.model.strip())
    # モデル/サーバを変えたら両エンジンのセッションを破棄する。古い model で束縛された
    # セッションが残っていると、config を更新してもそちらが使われ続け（LM Studio が
    # 解決できない旧 model 名で 400 になる）、反映されたように見えない。
    # Note は get 時に再生成、Code は次のチャットで新規セッションになる。
    # 思考許容時間だけの更新では破棄しない（Note の会話文脈を無用に失わせない）。
    changed = (req.active_server is not None) or bool(req.model and req.model.strip())
    if changed:
        engine_adapter.reset_note_session()
        try:
            _require_manager().clear()
        except Exception:
            pass  # engine 未初期化時などは無害（次回起動で新 model が使われる）
    return {"ok": True, "active": config.get_active_server_index(),
            "model": config.active_server().get("model"),
            "think_budget_sec": settings.think_budget_sec}


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


@app.post("/api/copilot/read")
async def api_copilot_read():
    """開いている Copilot タブの会話ログを Markdown で取得する（Note モードの取り込みバー）。

    PrayLight の subprocess が数十秒かかるので to_thread に逃がす（イベントループを塞がない）。"""
    if not config.settings.copilot_enabled:
        return {"ok": False, "error": "Copilot 連携が無効です。⚙️ 設定でオンにしてください。", "transcript": ""}
    text = await asyncio.to_thread(copilot.read_conversation)
    if text.startswith("エラー"):
        return {"ok": False, "error": text, "transcript": ""}
    return {"ok": True, "error": "", "transcript": text}


def _sse(ev: dict) -> str:
    return f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"


def _turn_stream(sess, start_turn) -> StreamingResponse:
    """1ターンを worker スレッドで実行し SSE へ変換する共通部（Code/Note 両モード）。

    前提: sess.busy は取得済み（ここで必ず解放する）。start_turn(emit) がターン本体。
    クライアント切断時は協調キャンセルで worker を解放する（Lock 専有を防ぐ）。
    """
    q: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def emit(ev: dict) -> None:
        # worker スレッド → イベントループへ安全に受け渡し。
        loop.call_soon_threadsafe(q.put_nowait, ev)

    def worker() -> None:
        try:
            start_turn(emit)
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
                sess.cancel()

    return StreamingResponse(gen(), media_type="text/event-stream")


def _note_chat(req: ChatReq) -> StreamingResponse:
    """Note モードのチャット経路（NWP engine_adapter.stream_turn の CWP 版）。

    read 専用プロファイルの NoteSession（単一セッション）でターンを回す。動的コンテキスト
    （現在ファイル・参考ファイル・選択・添付案内）は note_prompts.build_user_text で
    ユーザーメッセージに載せる（pixie_core の「静的 system + 動的 user」設計と整合）。
    """
    _require_manager()  # bootstrap 済み（= pixie_core 初期化済み）の確認
    try:
        sess = engine_adapter.get_note_session()
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    sess.set_copilot(settings.copilot_enabled)  # トグルを次ターンに反映（ask_copilot の提示可否）
    # Note は単一セッション直列。実行中なら 409（Code モードと同じフロント契約）。
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "Note セッションは別のターンを実行中です。")

    # サーバ再起動後の初回ターン: サイドカー履歴（無ければフロント送付の履歴）で LLM 文脈を復元。
    if not sess.seeded:
        sess.seed_history(req.history or note_api.load_chat_messages())

    context = [{"path": c.path, "content": c.content}
               for c in req.context_files + req.ref_texts]
    user_text = note_prompts.build_user_text(
        req.message, req.selection, context,
        req.current_file or "", req.current_content, req.attach_files)

    return _turn_stream(sess, lambda emit: sess.run_turn(user_text, emit))


@app.post("/api/chat")
async def api_chat(req: ChatReq):
    if not req.message.strip():
        raise HTTPException(400, "空のメッセージです。")
    if mode.current_mode() == "note":
        return _note_chat(req)

    manager = _require_manager()
    sess = manager.get_or_create(_valid_sid(req.session_id))
    sess.set_copilot(config.settings.copilot_enabled)  # トグルを次ターンに反映（ask_copilot の提示可否）
    # 同一セッションは直列（別セッションは並行可）。実行中なら 409。
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "このセッションは別のターンを実行中です。")

    # 開いているファイルをコンテキストとして前置する。小型モデルは「このファイル」「今開いて
    # いるファイル」という指示語からパスを推測できず、ハルシネートしたパスを探し回る実測がある。
    message = req.message
    if req.current_file:
        message = (
            f"（コンテキスト: ユーザーが現在エディタで開いているファイルは {req.current_file} です。"
            f"「このファイル」「今開いているもの」等の指示語はこのファイルを指します。）\n\n"
            f"{req.message}"
        )

    return _turn_stream(sess, lambda emit: sess.run_turn(message, emit, settings.approval_timeout))


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


# --- Note 系 API・モード切替（Stage C） -----------------------------------------
app.include_router(note_api.router)
app.include_router(mode.router)

# モード切替時に旧モードの LLM 文脈を持ち越さない（mode.py の POST /api/mode が呼ぶ）。
mode.register_reset_hook(engine_adapter.reset_note_session)
mode.register_reset_hook(lambda: _manager.clear() if _manager is not None else None)


# --- 静的フロント -------------------------------------------------------------
# app.js / style.css の mtime をクエリに埋め込んで返す（ブラウザの古い JS キャッシュで
# 機能追加が反映されない事故を防ぐ）。ファイルを更新すると mtime が変わり URL が変わるので、
# ブラウザは必ず新しい版を再取得するようになる。
_BUILT_ASSETS = ("js/app.js", "css/style.css")


@app.get("/")
def index():
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    for rel in _BUILT_ASSETS:
        try:
            mtime = int((STATIC / rel).stat().st_mtime)
        except OSError:
            continue
        target = f"/static/{rel}"
        html = html.replace(f'"{target}"', f'"{target}?v={mtime}"')
    return HTMLResponse(html)


app.mount("/static", StaticFiles(directory=STATIC), name="static")


def run() -> None:
    import uvicorn

    print(f"CodeWithPixie -> http://{settings.host}:{settings.port}  (workspace: {config.WORKSPACE})")
    # 注意: reload はワーカースレッド/グローバル状態と相性が悪いので使わない（監査指摘）。
    uvicorn.run(app, host=settings.host, port=settings.port)


if __name__ == "__main__":
    run()
