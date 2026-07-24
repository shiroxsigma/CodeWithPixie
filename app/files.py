"""ワークスペース内のファイル操作。ルート外アクセスを厳格に禁止する（閲覧・編集 API 用）。

注意: これはフロントの「ファイルツリー表示 / エディタ読み書き」用の安全アクセス層。
エージェント自身の書き込みは AWP のツール(write_file 等)が行い、こちらは通らない
（AWP ツールは cwd=ワークスペースに chdir 済みという前提でサンドボックスされる）。
"""
from __future__ import annotations

import os

from pathlib import Path

from . import config  # WORKSPACE を動的に参照する

# コードエディタとして扱う拡張子（NWP のマークダウン中心から大幅に拡張）。
TEXT_EXTS = {
    ".md", ".markdown", ".txt", ".rst",
    ".py", ".pyi", ".ipynb",
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".json", ".jsonc", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".c", ".h", ".cpp", ".cc", ".hpp", ".cs",
    ".java", ".kt", ".go", ".rs", ".rb", ".php", ".swift", ".scala",
    ".sh", ".bash", ".ps1", ".bat", ".cmd",
    ".sql", ".xml", ".vue", ".svelte", ".gradle", ".dockerfile", ".makefile",
}
IGNORE_DIRS = {".git", ".venv", "venv", "__pycache__", "node_modules", ".idea",
               ".vscode", "dist", "build", ".pixie_notes", ".mypy_cache", ".pytest_cache"}
# プレビューで <img> 表示してよい拡張子（/api/asset の配信対象。NWP から移植）
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}
MAX_BYTES = 2_000_000  # 2MB を超えるファイルは丸ごと読まない


def safe_path(rel: str) -> Path:
    """相対パスを WORKSPACE 内の絶対パスに解決。外に出ようとしたら ValueError。"""
    root = config.WORKSPACE
    p = (root / rel).resolve()
    if p != root and root not in p.parents:
        raise ValueError(f"path escapes workspace: {rel}")
    return p


def resolve_ref(path: str, external: bool) -> Path:
    """関連ファイル参照を絶対パスへ解決する（NWP から移植）。

    external=False はワークスペース相対 → safe_path でサンドボックス維持。
    external=True はワークスペース外の絶対パスを許可する唯一の経路。呼び出し側は
    「現在ノートの refs サイドカーに登録済みのパス」に限って呼ぶこと（任意パス防止）。
    """
    if not external:
        return safe_path(path)
    return Path(path).expanduser().resolve()




def is_text(rel: str) -> bool:
    """エディタで開ける（テキストとして読める）拡張子か。"""
    p = Path(rel)
    return p.suffix.lower() in TEXT_EXTS or p.name.lower() in {"makefile", "dockerfile"}


#: ツリー一覧の件数上限。これを超えると UI 側の DOM が重くなる（本来はツリーの
#: 遅延読み込み化が本丸。まずは「固まらない」ことを優先して刈る）。
MAX_LIST_ENTRIES = 20_000


def iter_entries():
    """ワークスペース内のファイル/フォルダを (相対パス, os.DirEntry) で巡る。

    **走査時に** IGNORE_DIRS / ドット始まりディレクトリへは降りない（dirnames の
    枝刈り）。旧実装（rglob して出力時に除外）は node_modules や .git の中まで
    一度全部辿るため、10万ファイル規模のツリーで致命的に遅かった（実測31秒→1.6秒）。
    scandir の DirEntry は is_dir/is_file/stat がキャッシュされる（追加 syscall 回避）。
    """
    root = config.WORKSPACE
    for dirpath, dirnames, _ in os.walk(root):
        # 降りないディレクトリをその場で捨てる（os.walk は dirnames の変更に従う）
        dirnames[:] = [d for d in dirnames
                       if d not in IGNORE_DIRS and not d.startswith(".")]
        try:
            with os.scandir(dirpath) as it:
                entries = sorted(it, key=lambda e: e.name)
        except OSError:
            continue  # 権限等で行けないディレクトリは黙って飛ばす
        for e in entries:
            if e.name.startswith("."):
                continue
            # 無視ディレクトリは中身だけでなくディレクトリ自体も一覧に出さない（旧挙動との整合）
            if e.name in IGNORE_DIRS and e.is_dir():
                continue
            yield os.path.relpath(e.path, root).replace(os.sep, "/"), e


def iter_text_files():
    """ワークスペース内のテキストファイルを (相対パス, Path) で巡る
    （mtime スナップショット・ロールバック用。枝刈り付きの共通走査を使う）。"""
    for rel, e in iter_entries():
        if e.is_file() and is_text(rel):
            yield rel, Path(e.path)


#: 1ディレクトリあたりのエントリ上限（遅延ツリーの1回の取得分）。
MAX_DIR_ENTRIES = 20_000


def list_dir(rel: str = "") -> dict:
    """指定ディレクトリの**直下だけ**を1階層ぶん返す（非再帰・枝刈り済み）。

    ツリーの遅延読み込み用 — フォルダ展開のたびにフロントが呼ぶ。rel="" は
    ワークスペースルート。エントリ形式は list_files と同じ + truncated。
    """
    base = safe_path(rel) if rel else config.WORKSPACE
    if not base.is_dir():
        raise ValueError(f"ディレクトリではありません: {rel}")
    out: list[dict] = []
    truncated = False
    try:
        with os.scandir(base) as it:
            entries = sorted(it, key=lambda e: e.name.lower())
    except OSError as e:
        raise ValueError(f"ディレクトリを開けません: {rel} ({e})")
    for e in entries:
        if e.name.startswith("."):
            continue
        if e.name in IGNORE_DIRS and e.is_dir():
            continue
        r = (base / e.name).relative_to(config.WORKSPACE).as_posix()
        if e.is_dir():
            out.append({"path": r, "type": "dir"})
        elif e.is_file():
            try:
                size = e.stat().st_size
            except OSError:
                size = 0
            out.append({"path": r, "type": "file", "size": size, "text": is_text(r)})
        if len(out) >= MAX_DIR_ENTRIES:
            truncated = True
            break
    return {"files": out, "truncated": truncated}


def list_files() -> dict:
    """ワークスペース内のファイルとフォルダをフラットリストで返す（type 付き）。

    拡張子でフィルタしない: .png や .pdf も一覧に出す（エディタでは開けないので
    フロントが OS の既定アプリに渡す）。text フラグでどちらかを示す。
    巨大ワークスペース向けに MAX_LIST_ENTRIES で打ち切る（truncated で伝える）。
    """
    out: list[dict] = []
    truncated = False
    for rel, e in iter_entries():
        if e.is_dir():
            out.append({"path": rel, "type": "dir"})
        elif e.is_file():
            try:
                size = e.stat().st_size
            except OSError:
                size = 0
            out.append({"path": rel, "type": "file", "size": size, "text": is_text(rel)})
        if len(out) >= MAX_LIST_ENTRIES:
            truncated = True
            break
    return {"files": out, "truncated": truncated}


def create(rel: str, kind: str) -> None:
    """空ファイルまたはフォルダを作成する。既存なら ValueError。"""
    p = safe_path(rel)
    if p.exists():
        raise ValueError(f"既に存在します: {rel}")
    if kind == "dir":
        p.mkdir(parents=True)
    else:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("", encoding="utf-8")


def rename(src: str, dst: str) -> None:
    """ファイル/フォルダの改名・移動（ワークスペース内のみ）。"""
    ps, pd = safe_path(src), safe_path(dst)
    if not ps.exists():
        raise FileNotFoundError(src)
    if pd.exists():
        raise ValueError(f"移動先が既に存在します: {dst}")
    pd.parent.mkdir(parents=True, exist_ok=True)
    ps.rename(pd)


def delete(rel: str) -> None:
    """ファイルを削除。フォルダは空の場合のみ削除（誤爆防止）。"""
    p = safe_path(rel)
    if not p.exists():
        raise FileNotFoundError(rel)
    if p.is_dir():
        if any(p.iterdir()):
            raise ValueError("フォルダが空ではありません。中のファイルを先に削除・移動してください。")
        p.rmdir()
    else:
        p.unlink()


def read_file(rel: str) -> str:
    p = safe_path(rel)
    if not p.is_file():
        raise FileNotFoundError(rel)
    if p.stat().st_size > MAX_BYTES:
        raise ValueError("file too large")
    return p.read_text(encoding="utf-8", errors="replace")


def write_file(rel: str, content: str) -> None:
    p = safe_path(rel)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def snapshot_mtimes() -> dict[str, float]:
    """ワークスペース内テキストファイルの (相対パス -> mtime) を撮る。変更検知用。
    枝刈り付きの共通走査を使う（各ターンで呼ばれるので、巨大ツリー全走査は許容できない）。"""
    snap: dict[str, float] = {}
    for rel, e in iter_text_files():
        try:
            snap[rel] = e.stat().st_mtime
        except OSError:
            continue
    return snap


def diff_changed(before: dict[str, float]) -> list[str]:
    """before スナップショット以降に新規/変更されたファイルの相対パスを返す。"""
    after = snapshot_mtimes()
    changed = [rel for rel, mt in after.items() if before.get(rel) != mt]
    return sorted(changed)
