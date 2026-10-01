"""Prevent unchanged Qwen read_file cycles without hiding fresh file content."""

from __future__ import annotations

import hashlib
from importlib import import_module
import json
from pathlib import Path
from typing import Callable


class QwenReadGuard:
    """Track reads in one engine run and reuse observations still in history."""

    def __init__(self, engine):
        self._engine = engine
        self._seen: dict[str, tuple[tuple[str, ...], str]] = {}
        try:
            module_root = type(engine).__module__.split(".", 1)[0]
            self._get_workspace_buffer = import_module(
                f"{module_root}.paths").get_workspace_buffer
        except Exception:
            # The guard is optional. Without the virtual-buffer source, a disk
            # hash could be different from the content read_file will return.
            self._get_workspace_buffer = None

    def _version(self, path: str) -> tuple[str, ...] | None:
        if self._get_workspace_buffer is None:
            return None
        try:
            target = Path(path)
            if not target.is_absolute():
                target = Path(self._engine.workspace) / target
            target = target.resolve()
            buffered = self._get_workspace_buffer(target)
            if buffered is not None:
                content = buffered.get("content")
                if not isinstance(content, str):
                    return None
                digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
                return ("buffer", str(target), digest)
            digest = hashlib.sha256()
            with target.open("rb") as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(block)
            return ("disk", str(target), digest.hexdigest())
        except Exception:
            # Invalid paths, unreadable files, buffer failures and hash errors
            # belong to pixie_core's read_file error handling, not this guard.
            return None

    def _observation_available(self, call_id: str) -> bool:
        history = self._engine.state.chat_history.messages
        for message in reversed(history):
            if (message.get("role") == "tool"
                    and message.get("tool_call_id") == call_id):
                content = message.get("content") or ""
                return bool(content) and not any(marker in content for marker in (
                    "[古い読込を圧縮", "[Observation masked]",
                ))
        return False

    def _forget_core_action(self, action: str) -> None:
        # pixie_core's repeated-read note and consecutive-loop check only key on
        # arguments. A changed file or masked observation must not be called stale.
        executed = self._engine.state.executed_actions
        executed[:] = [item for item in executed if item != action]

    def filter_calls(
        self,
        calls: list[dict],
        name_of: Callable[[dict], str],
        args_of: Callable[[dict], dict],
    ) -> tuple[list[dict], str | None]:
        kept = []
        skipped = []
        for call in calls:
            if name_of(call) != "read_file":
                kept.append(call)
                continue
            args = args_of(call)
            path = args.get("path") if isinstance(args, dict) else None
            call_id = call.get("id") if isinstance(call, dict) else None
            if not isinstance(path, str) or not path or not isinstance(call_id, str):
                kept.append(call)
                continue

            try:
                action = "read_file:" + json.dumps(args, sort_keys=True)
                version = self._version(path)
                if version is None:
                    kept.append(call)
                    continue
                previous = self._seen.get(action)
                if (previous is not None and previous[0] == version
                        and self._observation_available(previous[1])):
                    skipped.append(path)
                    continue
                if previous is not None:
                    self._forget_core_action(action)
                self._seen[action] = (version, call_id)
            except Exception:
                kept.append(call)
                continue
            kept.append(call)

        if kept or not skipped:
            return kept, None
        paths = ", ".join(dict.fromkeys(Path(path).name for path in skipped))
        return [], (
            f"【システム】{paths} は直近の同じ内容を read_file で取得済みです。"
            "前回のツール結果を使って作業を進めてください。"
            "別の箇所が必要な場合は start_line/end_line を指定してください。"
        )
