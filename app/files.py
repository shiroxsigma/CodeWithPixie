"""ワークスペース内のファイル操作。ルート外アクセスを厳格に禁止する（閲覧・編集 API 用）。

注意: これはフロントの「ファイルツリー表示 / エディタ読み書き」用の安全アクセス層。
エージェント自身の書き込みは AWP のツール(write_file 等)が行い、こちらは通らない
（AWP ツールは cwd=ワークスペースに chdir 済みという前提でサンドボックスされる）。
"""
from __future__ import annotations

import os

from pathlib import Path

from . import config  # WORKSPACE を動的に参照する
from . import history  # 保存前のローカル履歴（write_file が呼ぶ）

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
               ".vscode", "dist", "build", ".pixie_notes", ".pixie_history",
               ".mypy_cache", ".pytest_cache"}
# プレビューで <img> 表示してよい拡張子（/api/asset の配信対象。NWP から移植）
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}
MAX_BYTES = 2_000_000  # 2MB を超えるファイルは丸ごと読まない


def locked_message(p: Path) -> str:
    """読み取りが OS に拒否されたときの案内文（共有読みでも駄目だった場合）。

    read_bytes_shared が Office のロックは回避するので、ここまで来るのは権限その
    ものが無いケース（ACL・DLP・OneDrive のオンライン専用ファイル等）。
    """
    return (f"ファイルを読み取れません: {p.name}\n"
            "アクセス権が無いか、OneDrive の「オンラインのみ」でローカルに実体が"
            "無い可能性があります。エクスプローラで開けるか確認してください。")


# Windows で他アプリが開いているファイルを読むための共有フラグ（READ|WRITE|DELETE）。
#
# Python の open() は FILE_SHARE_READ|FILE_SHARE_WRITE で CreateFileW を呼ぶ。一方
# PowerPoint / Excel は保存を「別ファイルへ書いて差し替える」ために **DELETE アクセス
# 付き**でファイルを掴む。こちらの共有指定に FILE_SHARE_DELETE が無いと、その既存
# handle と両立しないと判定されて ERROR_SHARING_VIOLATION(32) になる — 読むだけなのに
# 開けないのはこれが理由で、権限の問題ではない。DELETE を足せば開いたままでも読める
# （実測: pptx を PowerPoint で開いた状態で share=READ|WRITE は失敗、+DELETE は成功）。
_FILE_SHARE_ALL = 0x1 | 0x2 | 0x4
_GENERIC_READ = 0x80000000
_OPEN_EXISTING = 3
_FILE_ATTRIBUTE_NORMAL = 0x80


def read_bytes_shared(p: Path, limit: int | None = None) -> bytes:
    """ファイルを bytes で読む。他アプリが開いていても読めるようにする。

    まず通常の読み取りを試し、PermissionError のときだけ Windows API へ落ちる
    （非 Windows、または本当に権限が無い場合は例外をそのまま伝播させる）。
    limit を渡すとその先頭バイト数だけ読む（マジックバイト判定用）。
    """
    try:
        with p.open("rb") as f:
            return f.read() if limit is None else f.read(limit)
    except PermissionError:
        if os.name != "nt":
            raise
        return _read_bytes_win_shared(p, limit)


def _read_bytes_win_shared(p: Path, limit: int | None = None) -> bytes:
    """CreateFileW を FILE_SHARE_DELETE 込みで直接呼んで読む（Windows 専用）。"""
    import ctypes
    from ctypes import wintypes

    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    k32.CreateFileW.argtypes = (wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                                wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD,
                                wintypes.HANDLE)
    k32.CreateFileW.restype = wintypes.HANDLE
    k32.ReadFile.argtypes = (wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
                             ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID)
    k32.ReadFile.restype = wintypes.BOOL
    k32.CloseHandle.argtypes = (wintypes.HANDLE,)
    k32.CloseHandle.restype = wintypes.BOOL

    handle = k32.CreateFileW(str(p), _GENERIC_READ, _FILE_SHARE_ALL, None,
                             _OPEN_EXISTING, _FILE_ATTRIBUTE_NORMAL, None)
    if handle == ctypes.c_void_p(-1).value:  # INVALID_HANDLE_VALUE
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        chunks: list[bytes] = []
        got = 0
        buf = ctypes.create_string_buffer(1 << 20)
        read = wintypes.DWORD()
        while limit is None or got < limit:
            want = len(buf) if limit is None else min(len(buf), limit - got)
            if not k32.ReadFile(handle, buf, want, ctypes.byref(read), None):
                raise ctypes.WinError(ctypes.get_last_error())
            if read.value == 0:
                break  # EOF
            chunks.append(buf.raw[:read.value])
            got += read.value
        return b"".join(chunks)
    finally:
        k32.CloseHandle(handle)


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


def mtime_of(rel: str) -> float:
    """ファイルの更新時刻（秒）。存在しなければ 0.0。

    「開いてから外部で書き換わっていないか」の照合に使う（`main.api_write`）。
    ディレクトリを指しても 0.0 にはせず素直に返す — 呼び出し側はファイルにしか使わない。
    """
    p = safe_path(rel)
    try:
        return p.stat().st_mtime
    except OSError:
        return 0.0


def write_file(rel: str, content: str) -> None:
    """テキストを書き込む。**書き込む前に旧内容をローカル履歴へ退避する。**

    退避をここに置くのは、UI 経由の書き込み（保存・自動保存・web2md）が全部この
    関数を通るため。エージェントの書き込みは AWP のツール側（ターン単位バックアップ
    あり）なのでここには来ない。履歴が取れなくても保存は通る（history.snapshot 内で
    握り潰す）。"""
    p = safe_path(rel)
    history.snapshot(rel)
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
