"""Accept verified short numeric answers in Qwen Note turns."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from functools import wraps
from importlib import import_module
import json
from pathlib import Path, PurePosixPath
import re
from threading import Lock
import unicodedata


_ACTIVE_NOTE_SCOPE: ContextVar[tuple[object, str | None] | None] = ContextVar(
    "cwp_qwen_concise_note_scope", default=None,
)
_INSTALL_LOCK = Lock()
_FILE = re.compile(
    r"(?<![A-Za-z0-9_.])(?:[A-Za-z]:[\\/])?(?:[\w.-]+[\\/])*[\w.-]+\.[A-Za-z0-9]{1,8}"
    r"(?![A-Za-z0-9_.])",
)
_NUMBER = re.compile(r"(?<![A-Za-z0-9_.])[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?![A-Za-z0-9_])")
_NUMERIC_REQUEST = re.compile(r"\b(?:numeric(?:al)?\s+value|numbers?|digits?|integer)\b|数値|数字", re.I)
_BRIEF_REQUEST = re.compile(
    r"\b(?:one|single)\s+(?:(?:short|brief)\s+)?(?:sentence|line)\b"
    r"|\b(?:brief(?:ly)?|short(?:ly)?|concise(?:ly)?)\b"
    r"|\b(?:just|only)\s+(?:the\s+)?(?:number|numeric(?:al)?\s+value|digits?)\b"
    r"|一文|一言|短く|簡潔|数値だけ|数値のみ|数字だけ|数字のみ",
    re.I,
)
_READ_HEADER = re.compile(
    r"(?m)^\[(?P<name>[^\]\r\n]+)\]\s+(?:全\d+行|\d+行目[〜~]\d+行目)[^\r\n]*\r?\n",
)


def _basename(path: str) -> str:
    return PurePosixPath(path.replace("\\", "/")).name.lower()


def _normalized_path(path: str) -> str:
    return str(PurePosixPath(path.replace("\\", "/"))).lower()


def _path_matches_request(actual: str, requested: str, workspace: str | None) -> bool:
    if workspace:
        root = Path(workspace).resolve()
        actual_path = Path(actual)
        requested_path = Path(requested)
        if not actual_path.is_absolute():
            actual_path = root / actual_path
        if not requested_path.is_absolute():
            requested_path = root / requested_path
        return actual_path.resolve() == requested_path.resolve()
    # Without a root, only an exact path can establish which file was read.
    return _normalized_path(actual) == _normalized_path(requested)


def _requested_file(user_text: str) -> str | None:
    # Note's Workset wrapper may mention other files; the final # 指示 section
    # contains the user's actual request.
    instruction = user_text.rsplit("# 指示\n", 1)[-1]
    if not (_NUMERIC_REQUEST.search(instruction) and _BRIEF_REQUEST.search(instruction)):
        return None
    paths = {_normalized_path(match.group()) for match in _FILE.finditer(instruction)}
    return next(iter(paths)) if len(paths) == 1 else None


def _answer_number(answer: str, filename: str) -> str | None:
    if not answer or len(answer) > 160 or "\n" in answer or "\r" in answer:
        return None
    if re.search(r"\b(?:error|not found|missing)\b|エラー|見つかりません|存在しません", answer, re.I):
        return None
    normalized = unicodedata.normalize("NFKC", answer)
    normalized = re.sub(re.escape(filename), "", normalized, flags=re.I)
    values = _NUMBER.findall(normalized)
    return values[0] if len(values) == 1 else None


def _read_body(result: str, filename: str) -> str | None:
    if not isinstance(result, str):
        return None
    result = result.lstrip()
    if result.startswith(("Error:", "エラー:", "エラー：")):
        return None
    if "[Observation masked]" in result or "[古い読込を圧縮" in result:
        return None
    header = _READ_HEADER.match(result)
    if header is None or _basename(header.group("name")) != filename:
        return None
    body = result[header.end():]
    if body.lstrip().startswith(("Error:", "エラー:", "エラー：")):
        return None
    return re.sub(r"(?m)^\d+:\s*", "", body)


def _has_matching_read(state: object, user_text: str, requested_path: str,
                       number: str, workspace: str | None) -> bool:
    messages = getattr(getattr(state, "chat_history", None), "messages", None)
    if not isinstance(messages, list):
        return False
    start = next((i for i in range(len(messages) - 1, -1, -1)
                  if messages[i].get("role") == "user"
                  and messages[i].get("content") == user_text), None)
    if start is None:
        return False

    filename = _basename(requested_path)
    read_ids: set[str] = set()
    for message in messages[start + 1:]:
        if message.get("role") == "assistant":
            for call in message.get("tool_calls") or []:
                function = call.get("function") or {}
                if function.get("name") != "read_file":
                    continue
                try:
                    args = json.loads(function.get("arguments") or "")
                except (TypeError, ValueError):
                    continue
                if (isinstance(args, dict) and isinstance(args.get("path"), str)
                        and _path_matches_request(args["path"], requested_path, workspace)
                        and isinstance(call.get("id"), str)):
                    read_ids.add(call["id"])
        elif message.get("role") == "tool" and message.get("tool_call_id") in read_ids:
            body = _read_body(message.get("content"), filename)
            if body is not None and set(_NUMBER.findall(
                    unicodedata.normalize("NFKC", body))) == {number}:
                return True
    return False


def _verified_short_numeric_answer(user_text: str, answer: str, state: object,
                                   workspace: str | None) -> bool | None:
    """Return None outside this narrow request class; otherwise fail closed."""
    requested_path = _requested_file(user_text)
    if requested_path is None:
        return None
    filename = _basename(requested_path)
    number = _answer_number(answer, filename)
    return bool(number and _has_matching_read(
        state, user_text, requested_path, number, workspace))


def install(core) -> None:
    """Wrap the core's private short-answer exception once per core module."""
    engine_module = import_module(f"{core.__name__}.engine")
    with _INSTALL_LOCK:
        original = getattr(engine_module, "_is_simple_direct_answer_sufficient", None)
        if not callable(original):
            return
        if getattr(original, "_cwp_qwen_concise_guard", False):
            return

        @wraps(original)
        def guarded(user_text, answer, state):
            original_result = original(user_text, answer, state)
            if original_result:
                return True
            scope = _ACTIVE_NOTE_SCOPE.get()
            if scope is not None and scope[0] is state:
                verified = _verified_short_numeric_answer(
                    user_text, answer, state, scope[1])
                if verified is not None:
                    return verified
            return original_result

        guarded._cwp_qwen_concise_guard = True
        engine_module._is_simple_direct_answer_sufficient = guarded


@contextmanager
def note_turn(core, state, workspace: str | None = None):
    """Limit the compatibility rule to this Qwen Note turn and state."""
    install(core)
    token = _ACTIVE_NOTE_SCOPE.set((state, workspace))
    try:
        yield
    finally:
        _ACTIVE_NOTE_SCOPE.reset(token)
