"""Note モード系 API（付箋・関連ファイル参照・会話履歴サイドカー・画像・アセット）。

NoteWithPixie/app/main.py の該当エンドポイントを APIRouter として移植したもの（Stage C）。
サイドカー JSON（.pixie_notes.json / .pixie_refs.json / .pixie_chat.json）はワークスペース
直下に置かれ、ワークスペース切替と一緒に切り替わる。

Code モードでも常に mount されるが追加のみで、既存の Code 系 API とは衝突しない
（/api/patch の mdflow 警告統合は main.py 側で行う）。
"""
from __future__ import annotations

import base64
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import config, engine_adapter, extract, files

router = APIRouter()


def _notes_file() -> Path:
    """付箋JSONの置き場所。ワークスペースと一緒に切り替わる。"""
    return config.WORKSPACE / ".pixie_notes.json"


def _refs_file() -> Path:
    """関連ファイル参照JSONの置き場所。ワークスペースと一緒に切り替わる。"""
    return config.WORKSPACE / ".pixie_refs.json"


def _chat_file() -> Path:
    """会話履歴JSONの置き場所。ワークスペースと一緒に切り替わる。"""
    return config.WORKSPACE / ".pixie_chat.json"


CHAT_HISTORY_LIMIT = 100  # 履歴は無制限に伸びるとプロンプトも保存も膨らむので上限を切る


def _load_sidecar(path: Path) -> dict:
    """サイドカーJSONを読む。手で編集されて壊れていてもアプリを落とさないよう、
    未作成・壊れたJSON・dict でない中身はすべて空 dict として扱う。

    ValueError で捕まえるのは、read_text が不正なUTF-8に対して投げる
    UnicodeDecodeError も含めるため（JSONDecodeError だけだと素通りして 500 になる）。"""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _save_sidecar(path: Path, data: dict) -> None:
    """サイドカーJSONを書く。人が開いて読めるよう日本語そのまま・インデント付き。

    一時ファイルへ書いてから置き換える。書き込み途中で落ちるとワークスペースの
    付箋・参照・履歴が丸ごと飛びうるため。"""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)  # 同一ディレクトリ内なのでアトミックに入れ替わる


def rewrite_sidecar_keys(src: str, dst: str) -> None:
    """ファイルパスをキーに持つサイドカーJSONを、改名・移動に追従させる（main.py の
    /api/fs/rename から呼ばれる）。フォルダ改名なら配下のキーもプレフィックス書き換え。
    会話履歴はワークスペース単位で1本（キーがノートパスではない）ので追従不要。"""
    for file in (_notes_file(), _refs_file()):
        data = _load_sidecar(file)
        changed = False
        for key in list(data.keys()):
            if key == src:
                data[dst] = data.pop(key)
                changed = True
            elif key.startswith(src + "/"):
                data[dst + key[len(src):]] = data.pop(key)
                changed = True
        if changed:
            _save_sidecar(file, data)


def load_chat_messages() -> list[dict]:
    """サイドカーの会話履歴（表示・永続の正）を返す。Note セッションの履歴シード用。"""
    messages = _load_sidecar(_chat_file()).get("messages", [])
    return messages if isinstance(messages, list) else []


# --- モデル -------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]  # それ以外の role は保存させない
    content: str


class ChatHistoryReq(BaseModel):
    messages: list[ChatMessage] = []


class FileRef(BaseModel):
    path: str            # external=false ならワークスペース相対、true なら OS 絶対パス
    external: bool = False
    name: str = ""       # 表示名（既定はファイル名）


class RefsSaveReq(BaseModel):
    path: str            # 対象ノートの相対パス
    refs: list[FileRef] = []


class RefOpenReq(BaseModel):
    note: str            # 参照が登録されているノート（認可のため）
    path: str
    external: bool = False


class ImageSaveReq(BaseModel):
    note: str          # 貼り付け先ノート（ワークスペース相対）。画像の保存先を決める
    data_b64: str      # 画像バイナリの base64。multipart にしないのは依存（python-multipart）を増やさないため
    ext: str = "png"
    name: str = ""     # 元ファイル名（D&D のとき）。空なら日時から自動命名


# --- 付箋（インラインコメント）の永続化 ---------------------------------------
@router.get("/api/notes")
def api_notes_get(path: str):
    return {"notes": _load_sidecar(_notes_file()).get(path, [])}


@router.post("/api/notes")
def api_notes_set(path: str, notes: list[dict]):
    notes_file = _notes_file()
    data = _load_sidecar(notes_file)
    data[path] = notes
    _save_sidecar(notes_file, data)
    return {"ok": True}


# --- 関連ファイル参照（別ディレクトリの .pptx 等をノートに紐付ける）-------------
def _load_refs(note: str) -> list[dict]:
    return _load_sidecar(_refs_file()).get(note, [])


@router.get("/api/refs")
def api_refs_get(path: str):
    return {"refs": _load_refs(path)}


@router.post("/api/refs")
def api_refs_set(req: RefsSaveReq):
    refs_file = _refs_file()
    data = _load_sidecar(refs_file)
    payload = [r.model_dump() for r in req.refs]
    if payload:
        data[req.path] = payload
    else:
        data.pop(req.path, None)  # 空になったらキーごと消す
    _save_sidecar(refs_file, data)
    return {"ok": True}


def _authorized_ref(note: str, path: str, external: bool) -> Path:
    """note の refs サイドカーに登録済みの参照だけを解決する。未登録なら拒否。"""
    for r in _load_refs(note):
        if r.get("path") == path and bool(r.get("external")) == external:
            return files.resolve_ref(path, external)
    raise HTTPException(403, "参照が登録されていません")


@router.post("/api/refs/open")
def api_refs_open(req: RefOpenReq):
    """関連ファイルを OS の既定アプリで開く。認可済み（登録済み）パスのみ。"""
    try:
        p = _authorized_ref(req.note, req.path, req.external)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not p.exists():
        raise HTTPException(404, f"ファイルが見つかりません: {p}")
    if os.name == "nt":
        os.startfile(str(p))  # noqa: S606 — ローカル専用アプリ、ユーザー起点、登録済みに限定
    else:
        # 他OS対応が必要なら xdg-open / open へフォールバックする
        import subprocess
        subprocess.Popen(["xdg-open", str(p)])
    return {"ok": True}


@router.get("/api/refs/read")
def api_refs_read(note: str, idx: int):
    """関連ファイル（テキスト）の内容を返す。AI 文脈同梱用。登録済みのみ許可。"""
    refs = _load_refs(note)
    if idx < 0 or idx >= len(refs):
        raise HTTPException(404, "参照が見つかりません")
    r = refs[idx]
    p = files.resolve_ref(r["path"], bool(r.get("external")))
    if not p.is_file():
        raise HTTPException(404, f"ファイルが見つかりません: {p}")
    if p.suffix.lower() in extract.SUPPORTED_EXTS:
        # Office 系は画像入りで数十MBが普通なので、テキスト上限とは別の上限にする
        # （抽出されるのはテキストだけで、レスポンス側は MAX_EXTRACT_CHARS で守られる）
        if p.stat().st_size > extract.MAX_OFFICE_BYTES:
            raise HTTPException(400, "file too large")
        try:
            return {"path": r["path"], "content": extract.extract_text(p)}
        except ValueError as e:
            raise HTTPException(400, str(e))
    if p.stat().st_size > files.MAX_BYTES:
        raise HTTPException(400, "file too large")
    return {"path": r["path"], "content": p.read_text(encoding="utf-8", errors="replace")}


# --- 会話履歴（ワークスペース単位で1本。ノート単位ではない）---------------------
@router.get("/api/chat/history")
def api_chat_history_get():
    # 壊れた/手編集されたサイドカーでも配列を約束する（フロントが必ず map できるように）
    return {"messages": load_chat_messages()}


@router.post("/api/chat/history")
def api_chat_history_set(req: ChatHistoryReq):
    payload = [m.model_dump() for m in req.messages[-CHAT_HISTORY_LIMIT:]]
    _save_sidecar(_chat_file(), {"messages": payload})
    return {"ok": True, "messages": payload}


@router.delete("/api/chat/history")
def api_chat_history_clear():
    # ファイルごと消すとワークスペースにゴミが残らない
    _chat_file().unlink(missing_ok=True)
    # フロントの履歴クリアとエンジン内 ChatHistory を同期させる（二層履歴の一致点）
    engine_adapter.reset_note_session()
    return {"ok": True}


# --- 画像（貼り付け・D&D で保存し、プレビューで配信する）------------------------
MAX_IMAGE_BYTES = 10_000_000  # 貼り付け画像の上限。スクリーンショット用途には十分


def _safe_image_stem(name: str) -> str:
    """画像ファイル名の元ネタを Markdown リンクとして安全な形へ。
    スペース・括弧は ![](path) のパス部分を壊すので、OS の禁止文字と一緒に潰す。"""
    return re.sub(r'[<>:"/\\|?*()\[\]\s\x00-\x1f]+', "_", name).strip("._")[:60]


@router.post("/api/image")
def api_image_save(req: ImageSaveReq):
    """画像をノートと同じ階層の images/ に保存し、ノートから貼るための相対パスを返す。"""
    ext = "." + req.ext.lower().lstrip(".")
    if ext not in files.IMAGE_EXTS:
        raise HTTPException(400, f"対応していない画像形式です: {ext}")
    try:
        data = base64.b64decode(req.data_b64, validate=True)
    except ValueError:
        raise HTTPException(400, "画像データを読めません（base64 が壊れています）")
    if not data:
        raise HTTPException(400, "画像データが空です")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "画像が大きすぎます（10MB まで）")
    try:
        note_p = files.safe_path(req.note)
    except ValueError as e:
        raise HTTPException(400, str(e))

    stem = _safe_image_stem(Path(req.name).stem) if req.name else ""
    if not stem:
        stem = f"{_safe_image_stem(note_p.stem) or 'image'}-{datetime.now():%Y%m%d-%H%M%S}"
    # 既存とぶつかったら -2, -3 と付けて絶対に上書きしない（貼った画像が別ノートの画像を消さない）
    n = 1
    while True:
        fname = f"{stem}{ext}" if n == 1 else f"{stem}-{n}{ext}"
        target = note_p.parent / "images" / fname
        if not target.exists():
            break
        n += 1
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {
        "ok": True,
        "path": target.relative_to(config.WORKSPACE).as_posix(),  # ワークスペース相対（一覧更新用）
        "rel": f"images/{fname}",                                 # ノートから見た相対（Markdown に書く方）
    }


@router.get("/api/asset")
def api_asset(path: str):
    """ワークスペース内の画像を返す（Markdown プレビューの <img> 用）。

    画像だけに限定する — テキストをこの経路で読ませない（/api/file を通す）。
    SVG はスクリプトを含みうるので、CSP で実行だけ止める（表示は許す）。"""
    try:
        p = files.safe_path(path)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if p.suffix.lower() not in files.IMAGE_EXTS:
        raise HTTPException(400, "画像ではありません")
    if not p.is_file():
        raise HTTPException(404, "not found")
    return FileResponse(p, headers={"Content-Security-Policy": "script-src 'none'"})
