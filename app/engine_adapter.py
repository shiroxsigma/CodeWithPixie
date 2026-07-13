"""AnythingWithPixie(AWP) の ReAct エンジンを Web から駆動するアダプタ。

方針（PLAN Phase 1）: pixie-core を今は切り出さず、AWP の `src` を sys.path に前置して
`engine.run_graph` を**そのまま**呼ぶ薄い境界に閉じ込める。AWP 側は一切変更しない。

AWP との結合はこのファイル1枚に閉じる。CWP の他モジュールは AWP を直接 import しない。

監査(Fable)反映点:
- F1 : ターン毎に reset_for_new_turn() → chat_history.add(user) してから run_graph。
- C1 : 中断は協調キャンセル（output_fn / interactive_fn で CancelTurn を送出＋承認を却下解放）。
- F2 : show_thinking=False で出力ストリームを単純化し、思考本文はストリームしない。
       出力は端末制御文字を除去し token / status に分類。
- C2 : 承認要求に相関 ID を付け、resolve 時に一致検証（古い/二重承認の誤解放を防ぐ）。
- C4 : 承認は「破壊的ツールのうち副作用の大きいもの」だけに限定。低リスク状態系は自動承認。
       タイムアウト既定は無期限（離席でターンが死なないように）。
- 追加: stdout を utf-8 再設定（engine 内の直書き print の UnicodeEncodeError でターンが死ぬのを防ぐ）。
        llm_model_name を設定（サンプリングプロファイル選択のため）。
        書き込みは mtime スナップショット差分で files_changed イベントとして自前発行。
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
#: （AWP の DESTRUCTIVE_TOOLS からこれらを除いた集合が「承認必須」になる）
APPROVAL_SKIP = frozenset({
    "update_core_memory", "update_state", "set_goal",
    "gather_project_info", "view_image", "make_directory",
})

#: 出力ストリーム中の非本文インジケータ（token ではなく status に回す/捨てる）。
_INDICATOR_HINTS = ("🧠", "⏳", "Prefill", "Thinking...")
_STATUS_PREFIXES = ("🔧", "✅", "⚠️", "🕊️", "🔍", "[System]", "[システム", "[Warning]", "[警告]")


class CancelTurn(Exception):
    """協調キャンセル: output_fn / interactive_fn から送出してターンを打ち切る。"""


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
    """1プロセス1セッション。AWP の AppContext / AgentState を保持し run_graph を回す。"""

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

        # AWP のツール(run_command/write_file 等)と永続状態(.pixie_notes)は cwd 基準。
        os.chdir(str(workspace))

        # --- AWP モジュール（sys.path 前置後にのみ解決可能） ---
        import importlib

        engine = importlib.import_module("engine")
        importlib.import_module("tools")       # @register_tool 副作用でツール登録
        importlib.import_module("code_tool")   # コード系ツール登録
        paths = importlib.import_module("paths")
        from main import AppContext            # 実クラスを使う（duck-type 自作はしない: 監査指摘）
        from state import AgentState
        from registry import set_state_board, TOOL_REGISTRY
        from llm_client import LMStudioBackend
        from config import DESTRUCTIVE_TOOLS

        paths.set_project_root(os.getcwd())

        ctx = AppContext()
        ctx.llm = LMStudioBackend(
            server["base_url"], server.get("api_key", "lm-studio"),
            server.get("model", "local-model"),
        )
        # サンプリングプロファイルはモデル名の部分一致で選ばれる（空だと常に default）。
        ctx.llm_model_name = server.get("model", "") or ""
        self.context = ctx

        self.state = AgentState()
        set_state_board(self.state.state_board)  # プロセスグローバル注入（単一セッション前提）

        self._run_graph = engine.run_graph
        self._build_system_text = engine.build_system_text
        self._approval_required = frozenset(DESTRUCTIVE_TOOLS) - APPROVAL_SKIP
        self.tool_count = len(TOOL_REGISTRY)
        self.model_name = ctx.llm_model_name

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
        self.state.reset_for_new_turn()                     # F1: カウンタ持ち越し防止
        self.state.chat_history.add("user", message)        # F1: user メッセージ投入

        try:
            self._run_graph(
                context=self.context,
                state=self.state,
                show_thinking=False,                        # F2: 思考本文はストリームしない
                system_msg_builder=self._build_system_text,
                interactive_fn=self._approve,
                output_fn=self._emit,
            )
        except CancelTurn:
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
            raise CancelTurn()
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
