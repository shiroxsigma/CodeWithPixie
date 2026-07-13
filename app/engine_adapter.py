"""AnythingWithPixie(AWP) の ReAct エンジンを Web から駆動するアダプタ。

Phase 2 以降: AWP 内部（engine/main/registry/...）へは直接触れず、AWP が公開する
**単一の安定境界 `pixie_core`** だけに依存する。これにより AWP の内部変更に対して
CWP が静かに壊れるリスク（監査 Fable の Major）を解消する。AWP/src を sys.path に
前置してから `import pixie_core` する、その1点だけが AWP との接点。

このファイルの責務（Web 固有・pixie_core には持ち込まない部分）:
- 出力(output_fn)を端末制御文字除去のうえ token/status の SSE イベントへ分類（監査 F2）。
- 承認(interactive_fn)を相関 ID 付きイベント化し、別リクエストの解放を待つ（監査 C2/C4）。
- 中断を協調キャンセル化（output_fn / interactive_fn から pixie_core.CancelTurn を送出：監査 C1）。
- 書き込みを mtime スナップショット差分で files_changed イベントとして自前発行。
- stdout の utf-8 再設定（engine 内の直書き print による UnicodeEncodeError 対策）。

ターンシーケンス(F1: reset→user追加→run_graph)は pixie_core.Engine.run_turn に集約済み。
"""
from __future__ import annotations

import json
import os
import re
import sys
import threading

from . import files

_ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")

#: 破壊的ツールのうち、承認をスキップして自動実行する低リスクの状態/参照系。
#: （pixie_core.DESTRUCTIVE_TOOLS からこれらを除いた集合が「承認必須」になる）
APPROVAL_SKIP = frozenset({
    "update_core_memory", "update_state", "set_goal",
    "gather_project_info", "view_image", "make_directory",
})

#: 出力ストリーム中の非本文インジケータ（token ではなく status に回す）。
_INDICATOR_HINTS = ("🧠", "⏳", "Prefill", "Thinking...")
_STATUS_PREFIXES = ("🔧", "✅", "⚠️", "🕊️", "🔍", "[System]", "[システム", "[Warning]", "[警告]")


def _tc_name(tc) -> str:
    if isinstance(tc, dict):
        fn = tc.get("function") or {}
        return fn.get("name") or tc.get("name") or ""
    fn = getattr(tc, "function", None)
    if fn is not None:
        return getattr(fn, "name", "") or ""
    return getattr(tc, "name", "") or ""


def _tc_args(tc) -> dict:
    if isinstance(tc, dict):
        fn = tc.get("function") or {}
        a = fn.get("arguments")
        if a is None:
            a = tc.get("arguments")
    else:
        fn = getattr(tc, "function", None)
        a = getattr(fn, "arguments", None) if fn is not None else getattr(tc, "arguments", None)
    if isinstance(a, str):
        try:
            return json.loads(a)
        except Exception:
            return {"_raw": a}
    return a or {}


class AgentSession:
    """1プロセス1セッション。pixie_core.Engine を保持し、Web からターンを回す。"""

    def __init__(self, awp_src, workspace, server: dict):
        awp_src = str(awp_src)
        if awp_src not in sys.path:
            sys.path.insert(0, awp_src)

        # engine 内の output_fn を通さない直書き print が cp932 コンソールで
        # UnicodeEncodeError を投げると worker スレッドのターンが例外死する（監査指摘）。
        for stream in (sys.stdout, sys.stderr):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
            except Exception:
                pass

        # AWP との唯一の接点: 公開境界 pixie_core だけを import する。
        import pixie_core

        if not str(getattr(pixie_core, "API_VERSION", "")).startswith("1."):
            raise RuntimeError(f"pixie_core API 非互換: {getattr(pixie_core, 'API_VERSION', '?')}")

        self._core = pixie_core
        self._CancelTurn = pixie_core.CancelTurn
        self._engine = pixie_core.create_engine(server, str(workspace))  # cwd/状態注入もここで完結

        self._approval_required = frozenset(pixie_core.DESTRUCTIVE_TOOLS) - APPROVAL_SKIP
        self.tool_count = self._engine.tool_count
        self.model_name = self._engine.model_name
        if self.tool_count <= 0:  # 起動スモーク
            raise RuntimeError("pixie_core: ツールが1つも登録されていません")

        # ターン実行の排他（1セッション）。main.py が非ブロッキングで取得する。
        self.busy = threading.Lock()

        # 承認の相関 ID とイベント。
        self._approval_event = threading.Event()
        self._approval_decision: dict | None = None
        self._approval_id = 0
        self._pending_id = 0

        # ターン単位の状態。
        self._emit_event = None
        self._cancel = False

    # ---- ターン実行（worker スレッドで呼ばれる） ----
    def run_turn(self, message: str, emit_event, approval_timeout: float = 0.0) -> None:
        self._emit_event = emit_event
        self._cancel = False
        self._approval_timeout = approval_timeout if approval_timeout and approval_timeout > 0 else None

        before = files.snapshot_mtimes()
        try:
            # ターンシーケンス(reset→user追加→run_graph)は pixie_core 側に集約済み。
            self._engine.run_turn(message, output_fn=self._emit, interactive_fn=self._approve)
        except self._CancelTurn:
            emit_event({"type": "status", "text": "⏹ 中断しました。"})
        except Exception as e:  # worker の例外は SSE に流して握る（ハング防止）
            emit_event({"type": "error", "text": f"{type(e).__name__}: {e}"})
        finally:
            changed = files.diff_changed(before)
            if changed:
                emit_event({"type": "files_changed", "paths": changed})

    # ---- output_fn: engine → SSE イベント分類 ----
    def _emit(self, text, end="", flush=False):
        if self._cancel:
            raise self._CancelTurn()
        if not text:
            return
        s = _ANSI.sub("", text).replace("\r", "")
        if not s or not s.strip():
            return
        stripped = s.strip()

        # "AI: " プレフィックスは engine が各プランステップの本文頭に付ける（ターン毎ではない）。
        # 単独ピースなら捨て、先頭に付いていれば毎回剥がす。
        if stripped == "AI:":
            return
        if s.startswith("AI: "):
            s = s[4:]
            stripped = s.strip()
            if not stripped:
                return

        # 思考インジケータ（🧠 Thinking... 等）は status へ。
        if any(h in stripped for h in _INDICATOR_HINTS):
            self._emit_event({"type": "status", "text": stripped})
            return
        # ツール/システム行は status へ。
        if stripped.startswith(_STATUS_PREFIXES) or re.match(r"^\[\d+\]", stripped):
            self._emit_event({"type": "status", "text": stripped})
            return

        # 本文トークン（整形を壊さないよう s は strip しない）。
        self._emit_event({"type": "token", "text": s})

    # ---- interactive_fn: ツール実行直前の承認 ----
    def _approve(self, tool_calls, content):
        if self._cancel:
            return ([], None)

        names = [_tc_name(tc) for tc in tool_calls]
        if not any(n in self._approval_required for n in names):
            return (tool_calls, None)  # read系/低リスクのみ → 自動承認

        self._approval_id += 1
        aid = self._approval_id
        self._pending_id = aid
        calls_view = [{"name": _tc_name(tc), "args": _tc_args(tc),
                       "needs_approval": _tc_name(tc) in self._approval_required}
                      for tc in tool_calls]
        self._approval_decision = None
        self._approval_event.clear()
        self._emit_event({"type": "approval", "id": aid, "calls": calls_view,
                          "note": (content or "").strip()[:2000]})

        got = self._approval_event.wait(self._approval_timeout)
        self._pending_id = 0
        if self._cancel:
            return ([], None)
        if not got:
            self._emit_event({"type": "status", "text": "⏱ 承認タイムアウト → 却下しました。"})
            return ([], None)

        dec = self._approval_decision or {}
        if dec.get("id") != aid:
            return ([], None)  # 相関 ID 不一致（古い/別タブの承認）→ 却下
        if dec.get("override"):
            return ([], dec["override"])
        if dec.get("approve"):
            return (tool_calls, None)
        return ([], None)

    # ---- 承認の解決（async エンドポイントから呼ぶ。Lock は取らない: 自己デッドロック回避） ----
    def resolve_approval(self, approval_id: int, approve: bool, override: str | None = None) -> bool:
        if approval_id != self._pending_id or self._pending_id == 0:
            return False
        self._approval_decision = {"id": approval_id, "approve": bool(approve), "override": override or None}
        self._approval_event.set()
        return True

    def cancel(self) -> None:
        self._cancel = True
        self._approval_event.set()  # 承認待ちを解放（_approve が [] を返して終了）
