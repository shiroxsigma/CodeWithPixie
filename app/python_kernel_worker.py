"""永続 Python カーネルの子プロセス。

stdin/stdout は JSON Lines プロトコル専用。ユーザーコードの stdout/stderr は
イベントへ変換するため、プロトコルへ生の文字列が混ざらない。
"""
from __future__ import annotations

import ast
import contextlib
import io
import json
import sys
import traceback


def _send(payload: dict) -> None:
    sys.__stdout__.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.__stdout__.flush()


class _EventWriter(io.TextIOBase):
    def __init__(self, stream: str):
        self.stream = stream

    def write(self, text: str) -> int:
        for start in range(0, len(text), 4096):
            _send({"type": "output", "stream": self.stream, "text": text[start:start + 4096]})
        return len(text)

    def flush(self) -> None:
        return None


def _execute(code: str, namespace: dict) -> None:
    """セルを実行し、末尾が式ならJupyter同様にreprを返す。"""
    try:
        tree = ast.parse(code, filename="<pixie-cell>", mode="exec")
        tail = tree.body.pop() if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        with contextlib.redirect_stdout(_EventWriter("stdout")), \
                contextlib.redirect_stderr(_EventWriter("stderr")):
            if tree.body:
                exec(compile(tree, "<pixie-cell>", "exec"), namespace, namespace)
            if tail is not None:
                value = eval(compile(ast.Expression(tail.value), "<pixie-cell>", "eval"),
                             namespace, namespace)
                if value is not None:
                    _send({"type": "result", "text": repr(value)})
        _send({"type": "done", "ok": True})
    except BaseException:  # セルの例外はカーネルを終了させず結果として返す
        _send({"type": "error", "text": traceback.format_exc()})
        _send({"type": "done", "ok": False})


def main() -> None:
    namespace = {"__name__": "__pixie_kernel__", "__builtins__": __builtins__}
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if request.get("op") == "execute":
                _execute(str(request.get("code") or ""), namespace)
            elif request.get("op") == "ping":
                _send({"type": "done", "ok": True})
            else:
                _send({"type": "error", "text": "unknown operation"})
                _send({"type": "done", "ok": False})
        except Exception:
            _send({"type": "error", "text": traceback.format_exc()})
            _send({"type": "done", "ok": False})


if __name__ == "__main__":
    main()
