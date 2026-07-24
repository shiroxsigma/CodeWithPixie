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

from . import (code_chat, compact, config, copilot, copilot_flow, engine_adapter, extract,
               files, mdflow, mode, note_api, note_prompts, patch, search)
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
    plan_first: bool = False               # Code モード plan-first サブモード: このターンは
                                           # 読み取り専用ツールで調査し ```plan の計画だけを出す


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
    context_length: int | None = None     # 手動コンテキスト長（トークン、0=自動）。アクティブサーバに紐づく


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
        "context_length": config.get_active_server_context_length(),  # 0=自動
        "context_length_min": config.CONTEXT_LENGTH_MIN,
        "context_length_max": config.CONTEXT_LENGTH_MAX,
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
    if req.context_length is not None:
        try:
            config.set_active_server_context_length(req.context_length)
        except ValueError as e:
            raise HTTPException(400, str(e))
    # モデル/サーバ/コンテキスト長を変えたら両エンジンのセッションを破棄する。古い model で
    # 束縛されたセッションが残っていると、config を更新してもそちらが使われ続け（LM Studio が
    # 解決できない旧 model 名で 400 になる）、反映されたように見えない。コンテキスト長も
    # n_ctx はセッション生成時に上書きするので、作り直さないと反映されない。
    # Note は get 時に再生成、Code は次のチャットで新規セッションになる。
    # 思考許容時間だけの更新では破棄しない（Note の会話文脈を無用に失わせない）。
    changed = (req.active_server is not None) or bool(req.model and req.model.strip()) \
        or (req.context_length is not None)
    if changed:
        engine_adapter.reset_note_session()
        try:
            _require_manager().clear()
        except Exception:
            pass  # engine 未初期化時などは無害（次回起動で新 model が使われる）
    return {"ok": True, "active": config.get_active_server_index(),
            "model": config.active_server().get("model"),
            "think_budget_sec": settings.think_budget_sec,
            "context_length": config.get_active_server_context_length()}


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


#: Code モードで前置きする選択範囲の上限文字数（これを超えると本題が押し流される）。
SELECTION_MAX_CHARS = 8000


def _code_user_text(req: ChatReq, message: str) -> str:
    """Code モードのユーザーテキスト（エディタ側の文脈を前置きする）。

    Note/Plan モードの note_prompts.build_user_text に相当する Code モード版。
    message を差し替えられるようにしてあるのは、/copilot が同じ文脈のまま「指示」だけを
    質問組み立て依頼に差し替えて使うため。
    """
    # 開いているファイルをコンテキストとして前置する。小型モデルは「このファイル」「今開いて
    # いるファイル」という指示語からパスを推測できず、ハルシネートしたパスを探し回る実測がある。
    if req.current_file:
        message = (
            f"（コンテキスト: ユーザーが現在エディタで開いているファイルは {req.current_file} です。"
            f"「このファイル」「今開いているもの」等の指示語はこのファイルを指します。）\n\n"
            f"{message}"
        )
    # ツリーでチェックされた参考ファイル（Note モードの build_user_text と同じ書式・上限）。
    if req.context_files:
        budget = settings.context_char_budget
        included: list[str] = []
        omitted: list[str] = []
        for f in req.context_files:
            if f.path == req.current_file:
                continue  # 開いているファイルは上で前置済み（未保存編集込みの方が新しい）
            content = f.content or ""
            if len(content) > note_prompts.MAX_CONTEXT_CHARS_PER_FILE:
                content = content[:note_prompts.MAX_CONTEXT_CHARS_PER_FILE] + "\n…（長いため以降を省略）"
            if len(content) > budget:
                omitted.append(f.path)
                continue
            budget -= len(content)
            included.append(f"## {f.path}\n```\n{content}\n```")
        if included:
            message = "# 参考ファイル（チェック済み）\n\n" + "\n\n".join(included) + "\n\n" + message
        if omitted:
            message = ("# 注記\nコンテキスト上限のため次のチェック済み参考ファイルは本文を省略した: "
                       + ", ".join(omitted) + "\n\n") + message
    # 選択範囲も渡す（Note モードと同じ機能を Code モードでも: 「この関数を直して」の「この」）。
    # 本文（未保存の編集を含むエディタ上の実体）を埋め込むのは、エージェントが read_file で
    # 読むとディスク上の古い内容になるため。長い選択は前置きが本題を押し流すので切り詰める。
    sel = (req.selection or "").strip()
    if sel:
        if len(sel) > SELECTION_MAX_CHARS:
            sel = sel[:SELECTION_MAX_CHARS] + "\n…（長いため以降を省略）"
        where = f"（{req.current_file}）" if req.current_file else ""
        message = (
            f"（コンテキスト: ユーザーがエディタで選択中のテキスト{where}。"
            f"「この関数」「選択部分」等はここを指します。エディタ上の実体なので、"
            f"ディスク上の内容と異なる場合はこちらが新しいです。）\n"
            f"```\n{sel}\n```\n\n{message}"
        )
    return message


# --- Code モード plan-first サブモード（先に計画 → 承認 → 実行） ----------------
def _code_plan_prompt(message: str) -> str:
    """計画フェーズの指示文。書き込みツールが無いターンであることを明示し、
    計画を ```plan フェンスで出させる（フロントがこのフェンスを検出して承認ビューへ載せる）。"""
    return (
        "# まず実行計画を立てる（このターンは調査と計画立案のみ。書き込み・実行ツールは提示されていない）\n"
        "ユーザーの依頼:\n" + message + "\n\n"
        "手順:\n"
        "1. read_file / grep_search / get_code_outline 等の読み取り専用ツールで、"
        "関係するファイルの実物を確認する（推測で計画しない）。\n"
        "2. このターンでは実装しない（書き込みツールは存在しない）。\n"
        "3. 最後に ```plan フェンス1つで計画を出力する。中身は日本語で、"
        "「変更するファイルと変更内容（順番付き）・検証方法・リスクや注意点」が分かるように。\n"
        "   自明な依頼（typo修正・1行変更等）でも、短い計画を書いてその旨を添えること。\n"
        "ユーザーが承認すると、この計画は次の指示としてそのままあなたに渡され、"
        "そのターンでフルツールを使って実装する。\n"
    )


def _code_plan_phase(sess, message: str, emit) -> None:
    """計画フェーズの1ターン: 読み取り専用ツールに制限して run_turn し、必ず元に戻す。

    承認後の実行は別ターン（フロントが計画を本文にした通常送信）なので、ここでの
    ツール制限はこのターン限りにする。中断・例外が起きても finally で復元すること —
    制限が残留すると、以降のターンが読み取り専用になってしまう。
    """
    sess.set_plan_phase(True)
    try:
        sess.run_turn(_code_plan_prompt(message), emit, settings.approval_timeout)
    finally:
        sess.set_plan_phase(False)


# --- /copilot 直行経路（NWP 移植）---------------------------------------------
COPILOT_QUESTION_MAX_CHARS = copilot_flow.QUESTION_MAX_CHARS


def _build_copilot_question(user_msg: str, selection: str, context_files: list[dict]) -> str:
    """/copilot 用に自己完結した質問文を組み立てる。

    Copilot はこの会話もワークスペースも見えないので、選択テキストとチェック済みの
    参考ファイルは本文に埋め込む（「開いているだけ」のファイルは入れない: 送るつもりの
    ないものが外部サービスへ出ていくのを避ける）。
    """
    parts = [user_msg]
    if selection.strip():
        parts.append(f"--- 選択テキスト ---\n{selection}")
    for c in context_files:
        parts.append(f"--- 添付ファイル: {c['path']} ---\n{c['content']}")
    q = "\n\n".join(parts)
    if len(q) > COPILOT_QUESTION_MAX_CHARS:
        q = q[:COPILOT_QUESTION_MAX_CHARS] + "\n…（長いため以降は省略）"
    return q


def _copilot_direct(question_text: str, req: ChatReq) -> StreamingResponse:
    """「/copilot! 質問…」: エージェント（LLM）を介さず Copilot に1回だけ聞いて返す。

    質問の組み立ても回答の反映もしない素の経路（それが要るときは /copilot →
    _copilot_orchestrated）。単に外部知識を聞きたいだけのときに、組み立ての待ち時間と
    ローカル LLM の解釈を挟まずに済ませるために残してある。

    エージェントもセッションも使わない直行経路なので、Code/Note どちらのモードでも通す
    （モードで変わるのはエージェントの振る舞いであって、この経路には関係がない）。
    セッションを取らないぶん sess.busy も踏まないので _turn_stream は使わず、ここで
    SSE を組む。イベントは通常ターンと同じ契約（status/token/error → 最後に done）。
    """
    context = [{"path": c.path, "content": c.content}
               for c in req.context_files + req.ref_texts]

    async def gen():
        if not settings.copilot_enabled:
            yield _sse({"type": "error",
                        "text": "Copilot 連携が無効です。⚙️ 設定でオンにしてください。"})
            yield _sse({"type": "done"})
            return
        if not question_text and not req.selection.strip():
            yield _sse({"type": "error",
                        "text": "`/copilot!` の後に質問を書いてください"
                                "（例: `/copilot! RAG の最新動向は？`）。テキスト選択だけでも送れます。"})
            yield _sse({"type": "done"})
            return

        question = _build_copilot_question(
            question_text or "以下のテキストについて意見をください。", req.selection, context)
        files_note = f"・添付 {len(req.attach_files)} 件" if req.attach_files else ""
        yield _sse({"type": "status",
                    "text": f"🕊️ /copilot: Copilot に直接質問します"
                            f"（{len(question)} 文字{files_note}・数十秒かかります）"})
        # copilot.ask は同期の subprocess（uvicorn reload 下の Windows では asyncio の
        # subprocess API が動かないため、このプロジェクトは同期実装を thread へ逃がす）。
        answer = await asyncio.to_thread(copilot.ask, question, list(req.attach_files))
        if answer.startswith("エラー"):
            # 1行目だけをステータス行に出し、全文は error として渡す（原因が長いことがある）
            yield _sse({"type": "status", "text": f"⚠️ {answer.splitlines()[0][:160]}"})
            yield _sse({"type": "error", "text": answer})
        else:
            yield _sse({"type": "status", "text": "✅ Copilot の回答を受信しました"})
            yield _sse({"type": "token", "text": answer})
        yield _sse({"type": "done"})

    return StreamingResponse(gen(), media_type="text/event-stream")


def _copilot_orchestrated(user_ask: str, req: ChatReq) -> StreamingResponse:
    """「/copilot 依頼…」: 組み立て → Copilot に質問 → 回答を反映、を1ターンで回す。

    直行経路（_copilot_direct）との違いは、両端にエージェントを立てること:
    質問文はこれまでの会話・ワークスペースを見て組み立てられ、回答は事実確認のうえ
    コードへ反映される。3フェーズとも同じセッション・同じ busy ロックの中で走るので、
    Copilot とのやりとりは会話履歴に残り、以降のターンの文脈になる。

    セッションの取り方はモードごとに違う（Code=複数セッション / Note・Plan=単一）が、
    フェーズの中身はモードに依らない — 反映のされ方（直接編集か編集ブロックか）は
    各モードのツールプロファイルと system_suffix が既に決めているため。
    """
    if not settings.copilot_enabled:
        return _error_stream("Copilot 連携が無効です。⚙️ 設定でオンにしてください。")

    current = mode.current_mode()
    _require_manager()  # bootstrap 済み（= pixie_core 初期化済み）の確認
    if current in ("note", "plan"):
        try:
            sess = (engine_adapter.get_note_session() if current == "note"
                    else engine_adapter.get_plan_session())
        except RuntimeError as e:
            raise HTTPException(503, str(e))
        approval_timeout = 0.0
    else:
        sess = _require_manager().get_or_create(_valid_sid(req.session_id))
        approval_timeout = settings.approval_timeout

    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "このセッションは別のターンを実行中です。")

    compose = copilot_flow.build_compose_prompt(user_ask)
    if current in ("note", "plan"):
        if current == "note" and not sess.seeded:
            sess.seed_history(req.history or note_api.load_chat_messages())
        context = [{"path": c.path, "content": c.content}
                   for c in req.context_files + req.ref_texts]
        compose_text = note_prompts.build_user_text(
            compose, req.selection, context,
            req.current_file or "", req.current_content, req.attach_files)
    else:
        compose_text = _code_user_text(req, compose)

    return _turn_stream(sess, lambda emit: copilot_flow.run(
        sess, compose_text=compose_text, user_ask=user_ask,
        attach_files=list(req.attach_files), emit=emit,
        approval_timeout=approval_timeout), label=req.message)


def _error_stream(text: str) -> StreamingResponse:
    """1件の error → done だけを返す SSE（セッションを取らずに断るとき用）。"""
    async def gen():
        yield _sse({"type": "error", "text": text})
        yield _sse({"type": "done"})
    return StreamingResponse(gen(), media_type="text/event-stream")


def _turn_stream(sess, start_turn, label: str = "") -> StreamingResponse:
    """1ターンを worker スレッドで実行し SSE へ変換する共通部（Code/Note 両モード）。

    前提: sess.busy は取得済み（ここで必ず解放する）。start_turn(emit) がターン本体。
    クライアント切断時は協調キャンセルで worker を解放する（Lock 専有を防ぐ）。

    ここで往復の記録（HistoryOps.begin_turn / end_turn）も開閉する。境界を run_turn では
    なくこの層に置くのは、/copilot のように1往復の中で run_turn が2回走る経路があるため
    — ユーザーから見た1往復が、後で消すときの1単位になる。ターン ID は最初の SSE
    イベントとして流し、フロントが吹き出しに紐づけて 🗑 で消せるようにする。
    """
    q: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    turn_id = sess.begin_turn(label)

    def emit(ev: dict) -> None:
        # worker スレッド → イベントループへ安全に受け渡し。
        loop.call_soon_threadsafe(q.put_nowait, ev)

    def worker() -> None:
        try:
            # ⏪ ロールバック用のターン前スナップショット（Code の AgentSession のみ持つ。
            # worker スレッドで実行し、イベントループをブロックしない）。
            if turn_id and hasattr(sess, "take_turn_snapshot"):
                sess.take_turn_snapshot(turn_id)
            start_turn(emit)
        finally:
            sess.end_turn()  # 中断・例外時も必ず閉じる（次ターンの境界がずれる）
            emit({"type": "__end__"})
            sess.busy.release()

    threading.Thread(target=worker, daemon=True).start()

    async def gen():
        done = False
        try:
            if turn_id:
                yield _sse({"type": "turn", "id": turn_id})
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

    return _turn_stream(sess, lambda emit: sess.run_turn(user_text, emit), label=req.message)


def _plan_chat(req: ChatReq) -> StreamingResponse:
    """Plan モードのチャット経路（承認付きの事前計画）。

    Note モードと同じ「読み取り専用の単一セッション」構造だが、履歴サイドカーは使わない
    （計画は承認して Code モードへ渡した時点で役目を終わるもので、ワークスペースに
    残す性質のものではない）。ファイル素材の組み立ては note_prompts.build_user_text を
    共用する — あれは「現在ファイル・参考ファイル・選択範囲を予算内でユーザーテキストへ
    載せる」汎用処理で、Note 固有の指示は system_suffix 側にあるため。
    """
    _require_manager()  # bootstrap 済み（= pixie_core 初期化済み）の確認
    try:
        sess = engine_adapter.get_plan_session()
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    sess.set_copilot(settings.copilot_enabled)
    # Plan も単一セッション直列。実行中なら 409（他モードと同じフロント契約）。
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "Plan セッションは別のターンを実行中です。")

    context = [{"path": c.path, "content": c.content}
               for c in req.context_files + req.ref_texts]
    user_text = note_prompts.build_user_text(
        req.message, req.selection, context,
        req.current_file or "", req.current_content, req.attach_files)

    return _turn_stream(sess, lambda emit: sess.run_turn(user_text, emit), label=req.message)


def _compact_chat(focus: str, req: ChatReq) -> StreamingResponse:
    """`/compact`: 現在モードのセッションの会話を要約し、履歴をそれ1件に畳む。

    要約は「そのセッションのエンジン」に書かせる必要がある（畳む対象の会話を持っている
    のがそこだけなので）。モードごとにセッションの取り方だけが違い、中身は共通。
    """
    sess, approval_timeout = _mode_session(req.session_id, create=True)
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "このセッションは別のターンを実行中です。")
    # サーバ再起動後いきなり /compact した場合、エンジンの文脈はまだ空。畳む対象は
    # 画面に見えている会話なので、通常ターンと同じくサイドカー履歴で先に復元する。
    if mode.current_mode() == "note" and not getattr(sess, "seeded", True):
        sess.seed_history(req.history or note_api.load_chat_messages())
    return _turn_stream(sess, lambda emit: compact.run(
        sess, focus=focus, emit=emit, approval_timeout=approval_timeout), label=req.message)


def _mode_session(session_id: str, create: bool = False):
    """現在モードのセッションと承認タイムアウトを返す（Code は session_id 別、Note/Plan は単一）。

    「今のモードのセッションはどれか」の判断はチャット経路のあちこちで要るので1箇所に集める。
    create=False で未作成なら (None, 0.0) — 履歴の統計や削除は、まだ会話が無いなら
    セッションを新規に立てる必要が無い（立てると空セッションが上限枠を食う）。
    """
    current = mode.current_mode()
    _require_manager()  # bootstrap 済み（= pixie_core 初期化済み）の確認
    if current in ("note", "plan"):
        if not create:
            peek = (engine_adapter.peek_note_session if current == "note"
                    else engine_adapter.peek_plan_session)
            return peek(), 0.0
        getter = (engine_adapter.get_note_session if current == "note"
                  else engine_adapter.get_plan_session)
        try:
            return getter(), 0.0
        except RuntimeError as e:
            raise HTTPException(503, str(e))
    manager = _require_manager()
    sid = _valid_sid(session_id)
    sess = manager.get_or_create(sid) if create else manager.get(sid)
    return sess, settings.approval_timeout


@app.post("/api/chat")
async def api_chat(req: ChatReq):
    if not req.message.strip():
        raise HTTPException(400, "空のメッセージです。")
    # /copilot 系。"!" 付きはエージェントを介さない直行（速いが文脈も反映も無い）、
    # 付かない方はエージェントが質問を組み立てて回答を反映するオーケストレーション。
    msg = req.message.strip()
    if msg.lower().startswith("/copilot!"):
        return _copilot_direct(msg[len("/copilot!"):].strip(), req)
    if msg.lower().startswith("/copilot"):
        return _copilot_orchestrated(msg[len("/copilot"):].strip(), req)
    # /compact はモードに依らず同じ処理（畳む対象は現在モードのセッションの会話）。
    if msg.lower().startswith("/compact"):
        return _compact_chat(msg[len("/compact"):].strip(), req)
    current = mode.current_mode()
    if current == "note":
        return _note_chat(req)
    if current == "plan":
        return _plan_chat(req)

    manager = _require_manager()
    sess = manager.get_or_create(_valid_sid(req.session_id))
    sess.set_copilot(config.settings.copilot_enabled)  # トグルを次ターンに反映（ask_copilot の提示可否）
    # 同一セッションは直列（別セッションは並行可）。実行中なら 409。
    if not sess.busy.acquire(blocking=False):
        raise HTTPException(409, "このセッションは別のターンを実行中です。")

    message = _code_user_text(req, req.message)
    if req.plan_first:
        return _turn_stream(sess, lambda emit: _code_plan_phase(sess, message, emit),
                            label=req.message)
    return _turn_stream(sess, lambda emit: sess.run_turn(message, emit, settings.approval_timeout),
                        label=req.message)


@app.post("/api/approve")
def api_approve(req: ApproveReq):
    sess = _require_manager().get(_valid_sid(req.session_id))
    if sess is None:
        raise HTTPException(404, "session not found")
    ok = sess.resolve_approval(req.id, req.approve, req.override)
    return {"ok": ok}


class ApproveEditReq(BaseModel):
    id: int
    session_id: str
    path: str      # 書き込み対象（プレビュー由来の絶対パス）
    content: str   # 差分ビューの右ペインでユーザーが編集した最終内容


@app.post("/api/approve-edit")
def api_approve_edit(req: ApproveEditReq):
    """「修正して承認」: 承認差分ビューで編集した内容をそのまま適用する。

    適用はこのエンドポイントが直接行い、元ツール呼び出しは override 付きで却下する —
    pixie_core は override をユーザーメッセージとして会話に積み、エージェントは
    「その書き込みは完了済み」と理解して後続のステップへ進む（二重書き込みしない）。
    """
    sess = _require_manager().get(_valid_sid(req.session_id))
    if sess is None:
        raise HTTPException(404, "session not found")
    # サンドボックス: セッションの workspace 配下のみ書き込み可（プレビューは絶対パスで来る）
    ws = Path(getattr(sess, "workspace", None) or config.WORKSPACE).resolve()
    p = Path(req.path)
    p = p.resolve() if p.is_absolute() else (ws / p).resolve()
    if p != ws and ws not in p.parents:
        raise HTTPException(400, "path outside workspace")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(req.content, encoding="utf-8")
    try:
        rel = p.relative_to(ws).as_posix()
    except ValueError:
        rel = str(p)
    override = (
        f"ユーザーがあなたの書き込み提案を差分ビューで修正し、そのまま適用しました"
        f"（{rel} は更新済みです）。この書き込みは完了したものとして扱い、"
        f"同じ書き込みを再度出さず、後続のステップを続けてください。"
    )
    ok = sess.resolve_approval(req.id, False, override)
    return {"ok": ok}


class RollbackReq(BaseModel):
    session_id: str
    turn_id: int


@app.post("/api/rollback")
def api_rollback(req: RollbackReq):
    """指定ターン開始前の状態へファイルを戻す（⏪ ボタン）。

    直近 ROLLBACK_KEEP_TURNS ターンぶんだけスナップショットを持つ。それより古い
    ターンや容量上限で捕まえられなかったターンは ok=False。
    """
    sess = _require_manager().get(_valid_sid(req.session_id))
    if sess is None:
        raise HTTPException(404, "session not found")
    if not hasattr(sess, "rollback"):
        raise HTTPException(400, "このモードはロールバック非対応です。")
    restored = sess.rollback(req.turn_id)
    if restored is None:
        return {"ok": False, "reason": "no snapshot"}
    return {"ok": True, "restored": restored}


@app.post("/api/interrupt")
def api_interrupt(req: InterruptReq):
    sess = _require_manager().get(_valid_sid(req.session_id))
    if sess is None:
        raise HTTPException(404, "session not found")
    sess.cancel()
    return {"ok": True}


# --- 会話文脈の節約（往復の削除 / 残量の確認 / まるごとリセット） -----------------
class TurnDeleteReq(BaseModel):
    session_id: str
    turn_id: int


class SessionClearReq(BaseModel):
    session_id: str


@app.post("/api/chat/turn/delete")
def api_turn_delete(req: TurnDeleteReq):
    """1往復ぶんを LLM 文脈から取り除く（回答が不要だったやりとりの後始末）。

    フロントの吹き出し削除と対で使う。セッションが既に無い（サーバ再起動・モード切替で
    破棄された）場合は 200 で removed=0 を返す — 消したい文脈がそもそも存在しないので、
    ユーザーから見れば成功と同じであり、エラーにすると表示だけ消せなくなる。
    """
    sess, _ = _mode_session(req.session_id)
    if sess is None:
        return {"ok": True, "removed": 0, "reason": "session gone"}
    removed = sess.drop_turn(req.turn_id)
    if removed < 0:
        return {"ok": False, "removed": 0,
                "reason": "unknown turn (already dropped / summarized / engine too old)"}
    return {"ok": True, "removed": removed}


@app.get("/api/context")
def api_context(session_id: str = ""):
    """現在モードのセッションが抱えている文脈の量（/context 表示用）。

    会話が始まっていなければセッションは作らずに空を返す。"""
    sess, _ = _mode_session(session_id)
    stats = sess.history_stats() if sess is not None else {
        "supported": engine_adapter.HISTORY_API, "messages": 0, "chars": 0, "turns": []}
    stats["mode"] = mode.current_mode()
    stats["model"] = config.active_server().get("model") or ""
    return stats


@app.post("/api/session/clear")
def api_session_clear(req: SessionClearReq):
    """現在モードの会話（LLM 文脈）を丸ごと捨てる（`/clear`）。

    Note の保存履歴（.pixie_chat.json）はここでは消さない — 消すかどうかは
    DELETE /api/chat/history という別の意思表示に紐づいており、フロントが両方呼ぶ。
    """
    current = mode.current_mode()
    if current == "note":
        engine_adapter.reset_note_session()
    elif current == "plan":
        engine_adapter.reset_plan_session()
    else:
        _require_manager().drop(_valid_sid(req.session_id))
    return {"ok": True, "mode": current}


# --- Note 系 API・モード切替（Stage C） -----------------------------------------
app.include_router(note_api.router)
app.include_router(mode.router)
app.include_router(code_chat.router)  # Code モードの会話ログ永続化


class RestoreSessionReq(BaseModel):
    session_id: str
    messages: list[dict] = []  # [{role, content}]（未指定ならサイドカーから読む）


@app.post("/api/code-chat/restore")
def code_chat_restore(req: RestoreSessionReq):
    """復元した会話をエンジン文脈にシードする（history_replace = API 1.6）。

    ツール呼び出し/結果のメッセージは pixie_core 側でフィルタされ、user/assistant の
    本文だけが文脈になる（会話の「筋」は残る。詳細なツール履歴は表示側のログで読める）。
    API 1.6 未満の pixie_core ではシードせず表示復元だけになる（ok=False で伝える）。
    """
    sid = _valid_sid(req.session_id)
    messages = req.messages
    if not messages:
        entry = code_chat.load_store().get(sid)
        messages = (entry or {}).get("messages") or []
    sess = _require_manager().get_or_create(sid)
    seeded = sess.replace_history([
        {"role": m.get("role"), "content": m.get("content") or ""} for m in messages
    ]) if messages else True
    return {"ok": bool(seeded)}

# モード切替時に旧モードの LLM 文脈を持ち越さない（mode.py の POST /api/mode が呼ぶ）。
mode.register_reset_hook(engine_adapter.reset_note_session)
mode.register_reset_hook(engine_adapter.reset_plan_session)
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
