"""Collect a bounded, shareable source snapshot from the selected project."""
from __future__ import annotations

import fnmatch
import os
import re
import stat
from dataclasses import dataclass
from pathlib import Path

from . import files

MAX_FILE_BYTES = 2_000_000
MAX_TOTAL_BYTES = 8_000_000
MAX_FILES = 2_000
MAX_SCAN_ENTRIES = 20_000
MAX_SKIPPED = 300
MAX_IGNORE_BYTES = 64_000
MAX_IGNORE_RULES = 2_000

_TEXT_EXTS = files.TEXT_EXTS | {
    ".csproj", ".fsproj", ".vbproj", ".vcxproj", ".sln", ".slnx",
    ".props", ".targets", ".resx", ".xaml", ".razor", ".cshtml",
    ".fs", ".fsx", ".vb", ".lua", ".dart", ".ex", ".exs",
    ".graphql", ".gql", ".proto", ".prisma", ".cmake", ".r",
}
_TEXT_NAMES = {
    "makefile", "dockerfile", "containerfile", "cmakelists.txt", "pipfile",
    "gemfile", "rakefile", "procfile", "justfile", "license", "notice",
    ".gitignore", ".gitattributes", ".editorconfig", ".dockerignore",
}
_IGNORE_DIRS = {name.lower() for name in files.IGNORE_DIRS} | {
    ".hg", ".svn", ".tox", ".nox", ".ruff_cache", ".next", ".nuxt",
    ".cache", ".gradle", ".angular", ".parcel-cache", ".svelte-kit",
    ".pixie_sessions", "env", "bin", "obj", "target", "packages",
    "vendor", "coverage", "htmlcov", "logs", "test-results",
    "playwright-report", ".ssh", ".aws", ".azure", ".gnupg",
}
_LOCK_NAMES = {"package-lock.json", "npm-shrinkwrap.json", "bun.lockb"}
_SECRET_NAMES = {
    ".token", ".npmrc", ".pypirc", ".netrc", "id_rsa", "id_dsa",
    "id_ecdsa", "id_ed25519", "credentials", "secrets", "tokens",
}
_SECRET_DIRS = {"credentials", "secrets", "private-keys", "private_keys",
                ".credentials", ".secrets", ".tokens"}
_SECRET_EXTS = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"}
_LANGUAGES = {
    ".py": "python", ".pyi": "python", ".js": "javascript",
    ".jsx": "jsx", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "tsx", ".cs": "csharp",
    ".md": "markdown", ".markdown": "markdown", ".sh": "bash",
    ".ps1": "powershell", ".yml": "yaml", ".csproj": "xml",
    ".slnx": "xml", ".props": "xml", ".targets": "xml",
}


def _is_link(path: Path) -> bool:
    """Include Windows junctions/reparse points, which are not always symlinks."""
    info = path.lstat()
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0)
        & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    )


def _file_exclusion(path: Path) -> str:
    name = path.name.lower()
    if (name in _SECRET_NAMES or name == ".env" or name.startswith(".env.")
            or path.suffix.lower() in _SECRET_EXTS
            or re.match(r"^\.?((credentials?|secrets?|tokens?|passwords?)[._-])", name)
            or re.match(r"^service[-_]?account[._-].*\.json$", name)):
        return "認証情報・秘密ファイル"
    if name in _LOCK_NAMES or name.endswith(".lock"):
        return "依存関係のロックファイル"
    if (name.endswith((".min.js", ".min.css", ".map", ".generated.cs", ".g.cs"))
            or name.endswith(".designer.cs") or name.endswith("-sources.md")):
        return "生成ファイル"
    if path.suffix.lower() not in _TEXT_EXTS and name not in _TEXT_NAMES:
        return "ソース・テキスト対象外"
    return ""


def _glob_path(pattern: str, relative: str) -> bool:
    """Match slash-separated gitignore globs without letting '*' cross '/'."""
    parts, names = pattern.split("/"), relative.split("/")
    states = {0}
    for part in parts:
        if part == "**":
            states = {index for start in states for index in range(start, len(names) + 1)}
        else:
            states = {index + 1 for index in states
                      if index < len(names) and fnmatch.fnmatchcase(names[index], part)}
        if not states:
            return False
    return len(names) in states


@dataclass(frozen=True)
class _IgnoreRule:
    base: str
    pattern: str
    negated: bool
    directory: bool
    anchored: bool

    def matches(self, relative: str, is_dir: bool) -> bool:
        if self.directory and not is_dir:
            return False
        prefix = self.base + "/" if self.base else ""
        if not relative.startswith(prefix):
            return False
        local = relative[len(prefix):]
        return (_glob_path(self.pattern, local) if self.anchored or "/" in self.pattern
                else fnmatch.fnmatchcase(local.rsplit("/", 1)[-1], self.pattern))


def _ignored(relative: str, is_dir: bool, rules: tuple[_IgnoreRule, ...]) -> bool:
    ignored = False
    for rule in rules:
        if rule.matches(relative, is_dir):
            ignored = not rule.negated
    return ignored


def _ignore_rules(directory: Path, root: Path) -> tuple[_IgnoreRule, ...]:
    """Common gitignore rules, including nested files, negation and globstar.

    Ignored directories are pruned as Git does; a rule cannot reinclude a file
    below an ignored parent. Global Git excludes are intentionally not consulted.
    """
    path = directory / ".gitignore"
    try:
        if _is_link(path) or path.stat().st_size > MAX_IGNORE_BYTES:
            return ()
        raw = files.read_bytes_shared(path, MAX_IGNORE_BYTES + 1)
        if len(raw) > MAX_IGNORE_BYTES:
            return ()
        content = raw.decode("utf-8-sig")
    except (OSError, UnicodeError):
        return ()
    base = directory.relative_to(root).as_posix()
    base = "" if base == "." else base
    rules = []
    for line in content.splitlines():
        line = line.rstrip()
        if not line or line.startswith("#"):
            continue
        negated = line.startswith("!")
        if negated:
            line = line[1:]
        if line.startswith((r"\#", r"\!")):
            line = line[1:]
        directory_only = line.endswith("/")
        anchored = line.startswith("/")
        pattern = line.strip("/")
        if pattern:
            rules.append(_IgnoreRule(base, pattern, negated, directory_only, anchored))
        if len(rules) >= MAX_IGNORE_RULES:
            break
    return tuple(rules)


def _overlay_path(root: Path, current_file: str) -> str:
    selected = Path(current_file)
    # abspath normalizes '..' without following links first.
    candidate = Path(os.path.abspath(selected if selected.is_absolute() else root / selected))
    try:
        relative = candidate.relative_to(root)
    except ValueError:
        raise ValueError("編集中のファイルが対象プロジェクトの外にあります。") from None
    if not relative.parts:
        raise ValueError("編集中のファイルのパスを指定してください。")
    cursor = root
    for part in relative.parts:
        cursor /= part
        try:
            if _is_link(cursor):
                raise ValueError("リンク先のファイルはソースまとめに含められません。")
        except FileNotFoundError:
            continue
    if candidate.resolve() != candidate:
        raise ValueError("編集中のファイルが対象プロジェクトの外にあります。")
    return relative.as_posix()


def _decode(raw: bytes) -> str:
    content = raw.decode("utf-16" if raw.startswith((b"\xff\xfe", b"\xfe\xff"))
                         else "utf-8-sig")
    if any(ord(char) < 32 and char not in "\n\r\t\f" for char in content):
        raise ValueError("バイナリファイル")
    return content


def _inline(value: str) -> str:
    fence = "`" * max(1, 1 + max((len(run) for run in re.findall(r"`+", value)), default=0))
    return f"{fence} {value.replace(chr(10), ' ').replace(chr(13), ' ')} {fence}"


def build_bundle(workspace: str | Path, *, current_file: str = "",
                 current_content: str | None = None) -> dict:
    """Return Markdown plus file counts/skips; never write to the project.

    Source bytes count the UTF-8 representation after BOM removal/decoding.
    ``truncated`` is true for resource limits, not routine excluded files.
    Unsaved content replaces an eligible existing file; it never bypasses the
    traversal, ignore, link or secret-file checks.
    """
    root = Path(workspace).expanduser().resolve()
    if not root.is_dir():
        raise ValueError("対象プロジェクトのフォルダが見つかりません。")
    if current_content is not None and not current_file:
        raise ValueError("未保存内容を含めるにはファイルのパスが必要です。")
    overlay = _overlay_path(root, current_file) if current_content is not None else ""
    sources: list[tuple[str, str]] = []
    skipped: list[dict[str, str]] = []
    omitted_skips = total_bytes = scanned = 0
    truncated = False
    overlay_used = False
    generated_frontend = (root / "frontend" / "src").is_dir()

    def skip(relative: str, reason: str) -> None:
        nonlocal omitted_skips
        if len(skipped) < MAX_SKIPPED:
            skipped.append({"path": relative, "reason": reason})
        else:
            omitted_skips += 1

    stack = [(root, ())]
    while stack:
        directory, inherited = stack.pop()
        rules = inherited + _ignore_rules(directory, root)[:max(0, MAX_IGNORE_RULES - len(inherited))]
        entries = []
        scan_limited = False
        try:
            with os.scandir(directory) as iterator:
                for entry in iterator:
                    if scanned >= MAX_SCAN_ENTRIES:
                        skip(directory.relative_to(root).as_posix(), "走査件数の上限")
                        truncated = True
                        scan_limited = True
                        break
                    scanned += 1
                    entries.append(entry)
        except OSError:
            skip(directory.relative_to(root).as_posix(), "フォルダを読み取れません")
            continue
        children = []
        for entry in sorted(entries, key=lambda item: (item.name.casefold(), item.name)):
            path = Path(entry.path)
            relative = path.relative_to(root).as_posix()
            try:
                if _is_link(path):
                    skip(relative, "シンボリックリンク・ジャンクション")
                    continue
                is_dir = entry.is_dir(follow_symlinks=False)
                if is_dir and (entry.name.lower() in _SECRET_DIRS
                               or entry.name.lower() == ".env"
                               or entry.name.lower().startswith(".env.")):
                    skip(relative + "/", "認証情報・秘密ファイル")
                    continue
                if is_dir and entry.name.lower() in _IGNORE_DIRS:
                    skip(relative + "/", "依存関係・生成物・内部データ")
                    continue
                if is_dir and generated_frontend and relative.lower() == "static/vue":
                    skip(relative + "/", "フロントエンドの生成ファイル")
                    continue
                if _ignored(relative, is_dir, rules):
                    skip(relative + ("/" if is_dir else ""), ".gitignore の対象")
                    continue
                if is_dir:
                    children.append((path, rules))
                    continue
                if not entry.is_file(follow_symlinks=False):
                    skip(relative, "通常ファイルではありません")
                    continue
                reason = _file_exclusion(path)
                if reason:
                    skip(relative, reason)
                    continue
                if len(sources) >= MAX_FILES:
                    truncated = True
                    skip(relative, "ファイル数の上限")
                    continue
                overlay_match = bool(overlay) and os.path.normcase(relative) == os.path.normcase(overlay)
                if overlay_match:
                    content = current_content
                    assert content is not None
                    size = len(content.encode("utf-8"))
                    if "\0" in content:
                        skip(relative, "バイナリファイル")
                        continue
                else:
                    if entry.stat(follow_symlinks=False).st_size > MAX_FILE_BYTES:
                        truncated = True
                        skip(relative, "ファイルサイズの上限")
                        continue
                    raw = files.read_bytes_shared(path, MAX_FILE_BYTES + 1)
                    if len(raw) > MAX_FILE_BYTES:
                        truncated = True
                        skip(relative, "ファイルサイズの上限")
                        continue
                    content = _decode(raw)
                    size = len(content.encode("utf-8"))
                if size > MAX_FILE_BYTES:
                    truncated = True
                    skip(relative, "ファイルサイズの上限")
                    continue
                if total_bytes + size > MAX_TOTAL_BYTES:
                    truncated = True
                    skip(relative, "合計サイズの上限")
                    continue
                sources.append((relative, content))
                total_bytes += size
                overlay_used |= overlay_match
            except UnicodeError:
                skip(relative, "UTF-8 / BOM 付き UTF-16 以外のファイル")
            except ValueError:
                skip(relative, "バイナリファイル")
            except OSError:
                skip(relative, "ファイルを読み取れません")
        if scan_limited or (scanned >= MAX_SCAN_ENTRIES and (children or stack)):
            truncated = True
            if not any(item["reason"] == "走査件数の上限" for item in skipped):
                skip(".", "走査件数の上限")
            break
        stack.extend(reversed(children))

    if not sources:
        raise ValueError("まとめられるソースファイルがありません。対象プロジェクトを確認してください。")
    sources.sort(key=lambda item: (item[0].casefold(), item[0]))
    skipped.sort(key=lambda item: (item["path"].casefold(), item["path"]))
    if omitted_skips:
        skipped.append({"path": "…", "reason": f"ほか {omitted_skips} 件の除外"})
    project = root.name or "project"
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", project).strip(" .")[:140] or "project"
    sections = [
        f"# {project} ソースまとめ\n",
        "各ファイルの見出しはプロジェクトルートからの相対パスです。\n",
        f"収録: {len(sources)} ファイル / {total_bytes:,} bytes (UTF-8)\n",
    ]
    if truncated:
        sections.append("**上限に達したため、一部のファイルが含まれていません。**\n")
    if overlay_used:
        sections.append(f"未保存の編集内容を反映: {_inline(overlay)}\n")
    for relative, content in sources:
        # Only lines that could close a CommonMark fence need a longer marker.
        # Choose the shorter of backticks/tildes to avoid inflating large runs.
        lengths = {"`": 2, "~": 2}
        for match in re.finditer(r"(?m)^ {0,3}(`{3,}|~{3,})[ \t]*\r?$", content):
            run = match.group(1)
            lengths[run[0]] = max(lengths[run[0]], len(run))
        marker = min(lengths, key=lengths.get)
        fence = marker * (lengths[marker] + 1)
        language = _LANGUAGES.get(Path(relative).suffix.lower(), Path(relative).suffix.lstrip("."))
        title = relative.replace("\n", r"\n").replace("\r", r"\r")
        sections.append(f"## {title}\n\n{fence}{language}\n{content}"
                        f"{'' if content.endswith(chr(10)) else chr(10)}{fence}\n")
    if skipped:
        sections.append("## 収録しなかった項目\n")
        sections.extend(f"- {_inline(item['path'])}: {item['reason']}" for item in skipped)
    return {
        "root": str(root), "filename": f"{filename}-sources.md",
        "content": "\n".join(sections) + "\n", "file_count": len(sources),
        "total_bytes": total_bytes, "skipped": skipped, "truncated": truncated,
    }
