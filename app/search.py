"""ripgrep によるワークスペース内の高速全文検索と、その結果に対する一括置換。

rg が無ければ Python でフォールバックする（挙動は揃えてある）。

検索結果には前後数行（`before` / `after`）を付ける。ヒット行1行だけでは
「これは直したい所か？」が判断できず、結局ファイルを開いて確かめることになるため。
前後行の取得は rg の -A/-B ではなくヒット後にファイルを読んで切り出す方式にしている
— rg --json の context イベントを組み立て直すより単純で、Python フォールバックと
同じコードを使い回せる（ヒットは同じファイルに固まりやすいので読み直しも1回で済む）。
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess

from pathlib import Path

from . import config  # WORKSPACE を動的に参照する
from .config import settings
from .files import IGNORE_DIRS, MAX_BYTES, TEXT_EXTS, is_text, safe_path, write_file

#: ヒット行の前後に付ける行数。
CONTEXT_LINES = 2

#: 1件あたりの表示上限（長い行でレイアウトを壊さない）。
MAX_LINE_CHARS = 200

#: 置換プレビューで1ファイルにつき見せる例の数。
MAX_SAMPLES = 3


def search(query: str, max_results: int = 50, case_sensitive: bool = False) -> list[dict]:
    """クエリにマッチした行を {path, line, text, before, after} のリストで返す。"""
    if not query.strip():
        return []
    if _rg_available():
        hits = _search_rg(query, max_results, case_sensitive)
    else:
        hits = _search_python(query, max_results, case_sensitive)
    return _attach_context(hits)


def _rg_available() -> bool:
    return shutil.which(settings.rg_path) is not None


def _search_rg(query: str, max_results: int, case_sensitive: bool) -> list[dict]:
    globs: list[str] = []
    for ext in TEXT_EXTS:
        globs += ["-g", f"*{ext}"]
    for d in IGNORE_DIRS:
        globs += ["-g", f"!{d}/**"]
    cmd = [settings.rg_path, "--json", "-s" if case_sensitive else "-i",
           "--max-count", "5", *globs, query, str(config.WORKSPACE)]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    except (subprocess.TimeoutExpired, OSError):
        return _search_python(query, max_results, case_sensitive)

    results: list[dict] = []
    for line in proc.stdout.splitlines():
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("type") != "match":
            continue
        data = obj["data"]
        path = data["path"]["text"]
        rel = _rel(path)
        results.append({
            "path": rel,
            "line": data["line_number"],
            "text": data["lines"]["text"].rstrip("\n")[:MAX_LINE_CHARS],
        })
        if len(results) >= max_results:
            break
    return results


def _search_python(query: str, max_results: int, case_sensitive: bool) -> list[dict]:
    q = query if case_sensitive else query.lower()
    root = config.WORKSPACE
    results: list[dict] = []
    for p in root.rglob("*"):
        if any(part in IGNORE_DIRS for part in p.relative_to(root).parts):
            continue
        if not (p.is_file() and p.suffix.lower() in TEXT_EXTS):
            continue
        try:
            for i, line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
                if q in (line if case_sensitive else line.lower()):
                    results.append({"path": p.relative_to(root).as_posix(), "line": i,
                                    "text": line[:MAX_LINE_CHARS]})
                    if len(results) >= max_results:
                        return results
        except OSError:
            continue
    return results


def _attach_context(hits: list[dict]) -> list[dict]:
    """各ヒットに前後 CONTEXT_LINES 行を足す。同じファイルは1回だけ読む。"""
    if not hits:
        return hits
    cache: dict[str, list[str] | None] = {}
    for hit in hits:
        rel = hit["path"]
        if rel not in cache:
            cache[rel] = _read_lines(rel)
        lines = cache[rel]
        if lines is None:
            hit["before"], hit["after"] = [], []
            continue
        idx = hit["line"] - 1  # 1-origin の行番号 → 0-origin の添字
        hit["before"] = [ln[:MAX_LINE_CHARS] for ln in lines[max(0, idx - CONTEXT_LINES):idx]]
        hit["after"] = [ln[:MAX_LINE_CHARS] for ln in lines[idx + 1:idx + 1 + CONTEXT_LINES]]
    return hits


def _read_lines(rel: str) -> list[str] | None:
    try:
        p = safe_path(rel)
        if not p.is_file() or p.stat().st_size > MAX_BYTES:
            return None
        return p.read_text(encoding="utf-8", errors="replace").splitlines()
    except (OSError, ValueError):
        return None


def _rel(abs_path: str) -> str:
    try:
        return Path(abs_path).resolve().relative_to(config.WORKSPACE).as_posix()
    except ValueError:
        return abs_path


# --- 一括置換 -----------------------------------------------------------------
def _pattern(query: str, case_sensitive: bool) -> re.Pattern:
    """常に**リテラル**として扱う（re.escape）。検索欄に打った文字列がそのまま
    正規表現として効くと、`.` や `(` を含む語で意図しない範囲まで壊しかねない。"""
    return re.compile(re.escape(query), 0 if case_sensitive else re.IGNORECASE)


def _literal(replacement: str):
    """置換文字列もリテラル化する。`re.sub` は置換側を**テンプレート**として読むので、
    `\\1` は後方参照、`\\d` は「不正なエスケープ」で例外になる。`C:\\data` のような
    Windows パスに置換しようとしただけで落ちるのはさすがに困る。関数を渡せば
    テンプレート解釈自体が起きない。"""
    return lambda _m: replacement


def replace_in_files(query: str, replacement: str, paths: list[str],
                     case_sensitive: bool = False, dry_run: bool = True) -> dict:
    """指定ファイル群の `query` を `replacement` に置き換える。

    `dry_run=True` なら何も書かず件数と例だけ返す。実行時は `files.write_file` を
    通すので、各ファイルの旧内容はローカル履歴（.pixie_history）に退避される。

    対象は呼び出し側が明示した `paths` に限る — 「マッチした全ファイル」を暗黙に
    書き換えると、一覧に出ていない（件数上限で切られた）ファイルまで巻き込む。
    """
    if not query:
        raise ValueError("検索語を指定してください。")
    pat = _pattern(query, case_sensitive)
    out: list[dict] = []
    total = 0
    for rel in paths:
        try:
            p = safe_path(rel)
        except ValueError:
            continue
        if not (p.is_file() and is_text(rel)):
            continue
        try:
            if p.stat().st_size > MAX_BYTES:
                continue
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        new_text, count = pat.subn(_literal(replacement), text)
        if not count:
            continue
        total += count
        out.append({"path": rel, "count": count,
                    "samples": _samples(text, pat, replacement)})
        if not dry_run:
            write_file(rel, new_text)
    return {"files": out, "total": total, "changed_files": len(out), "dry_run": dry_run}


def _samples(text: str, pat: re.Pattern, replacement: str) -> list[dict]:
    """置換前後の行を数件だけ拾う（プレビュー用）。行番号は元テキスト基準。"""
    out: list[dict] = []
    for i, line in enumerate(text.splitlines(), 1):
        if not pat.search(line):
            continue
        out.append({"line": i, "before": line[:MAX_LINE_CHARS],
                    "after": pat.sub(_literal(replacement), line)[:MAX_LINE_CHARS]})
        if len(out) >= MAX_SAMPLES:
            break
    return out
