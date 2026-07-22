"""ワークスペース内のファイル操作。ルート外アクセスを厳格に禁止する（閲覧・編集 API 用）。

注意: これはフロントの「ファイルツリー表示 / エディタ読み書き」用の安全アクセス層。
エージェント自身の書き込みは AWP のツール(write_file 等)が行い、こちらは通らない
（AWP ツールは cwd=ワークスペースに chdir 済みという前提でサンドボックスされる）。
"""
from __future__ import annotations

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


def _hidden(parts: tuple[str, ...]) -> bool:
    """無視ディレクトリ配下、またはドット始まりを隠す。"""
    return any(part in IGNORE_DIRS or part.startswith(".") for part in parts)


def is_text(rel: str) -> bool:
    """エディタで開ける（テキストとして読める）拡張子か。"""
    p = Path(rel)
    return p.suffix.lower() in TEXT_EXTS or p.name.lower() in {"makefile", "dockerfile"}


def list_files() -> list[dict]:
    """ワークスペース内のファイルとフォルダをフラットリストで返す（type 付き）。

    拡張子でフィルタしない: .png や .pdf も一覧に出す（エディタでは開けないので
    フロントが OS の既定アプリに渡す）。text フラグでどちらかを示す。
    """
    root = config.WORKSPACE
    out: list[dict] = []
    for p in sorted(root.rglob("*")):
        rel_parts = p.relative_to(root).parts
        if _hidden(rel_parts):
            continue
        rel = p.relative_to(root).as_posix()
        # OneDrive のプレースホルダ・同期競合・壊れた参照が1件あるだけで一覧全体が
        # 500 にならないよう、読めないエントリはスキップする。
        try:
            if p.is_dir():
                out.append({"path": rel, "type": "dir"})
            elif p.is_file():
                out.append({"path": rel, "type": "file", "size": p.stat().st_size,
                            "text": is_text(rel)})
        except OSError:
            continue
    return out


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
    """ワークスペース内テキストファイルの (相対パス -> mtime) を撮る。変更検知用。"""
    root = config.WORKSPACE
    snap: dict[str, float] = {}
    for p in root.rglob("*"):
        rel_parts = p.relative_to(root).parts
        if _hidden(rel_parts) or not p.is_file():
            continue
        if p.suffix.lower() in TEXT_EXTS or p.name.lower() in {"makefile", "dockerfile"}:
            try:
                snap[p.relative_to(root).as_posix()] = p.stat().st_mtime
            except OSError:
                continue
    return snap


def diff_changed(before: dict[str, float]) -> list[str]:
    """before スナップショット以降に新規/変更されたファイルの相対パスを返す。"""
    after = snapshot_mtimes()
    changed = [rel for rel, mt in after.items() if before.get(rel) != mt]
    return sorted(changed)
