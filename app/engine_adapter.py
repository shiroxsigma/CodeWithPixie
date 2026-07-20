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

from . import config, files, note_prompts, note_tools
from .config import settings

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

#: Note モードで LLM に提示する read 系ツール（ask_copilot は設定で加わる）。NWP から移植。
NOTE_TOOLS = frozenset({"list_workspace", "read_note", "grep_workspace", "describe_flows"})

#: pixie_core の base システムプロンプト末尾に足す静的指示（Note モード）。セッション内不変
#: （prefix cache 保護）。MDFLOW_PROMPT は常時静的に含める: ターン毎の条件注入は system を
#: 毎回変えて cache を全壊させるため、固定コスト（約700字）を払ってでも静的にする。
NOTE_SYSTEM_SUFFIX = (
    "# ノート執筆モード（最重要・このセクションが他の編集指示より優先される）\n"
    + note_prompts.IDENTITY
    + note_prompts.EDIT_PROTOCOL
    + note_prompts.MDFLOW_PROMPT
    + """
ツールの使い方:
- 依頼に必要な資料が手元に無ければ、list_workspace / grep_workspace で探し、read_note で読む。
- 最新情報・外部知識・推敲の別視点が必要なときだけ ask_copilot を使う（遅いので1依頼につき原則1回まで）。
- 必要な情報が揃ったら、ツールを呼ばずに最終回答を書く。ツール結果の丸写しではなく、依頼に沿って整理する。
- 推測でパスを書かない。実在確認できたファイルだけを参照する。
- 「現在エディタで開いているファイル」がメッセージに添付されている場合、その内容は未保存の編集を含む最新版。
  同じファイルを read_note で読み直さない（ディスク上の古い内容が返る）。
- ファイルへの書き込み・削除・コマンド実行はできない。変更はすべて上記の search/replace / apply
  ブロックで提案し、反映はユーザーに委ねる。
"""
)


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


# --- プロセス1回だけの AWP ブートストラップ（全セッション共有） ---
_core = None  # 読み込んだ pixie_core モジュール（キャッシュ）


def bootstrap(awp_src):
    """AWP/src を sys.path に前置し、公開境界 pixie_core を読み込む（プロセス1回）。

    マルチセッションでは複数の AgentSession を作るが、AWP モジュールの import と stdout の
    utf-8 化はプロセス共有の1回で済む。pixie_core.API_VERSION の互換性もここで検証する。
    """
    global _core
    if _core is not None:
        return _core

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

    import pixie_core  # AWP との唯一の接点

    ver = str(getattr(pixie_core, "API_VERSION", ""))
    # 1.4+ が必須: Note モードの固定ツールプロファイル（tool_set）・system_suffix・
    # load_history（履歴シード）を使うため（Stage C）。
    try:
        major, minor = (int(x) for x in ver.split(".")[:2])
    except ValueError:
        major, minor = 0, 0
    if (major, minor) < (1, 4):
        raise RuntimeError(f"pixie_core API 1.4 以上が必要です（現在: {ver or '?'}）。"
                           "AnythingWithPixie を更新してください。")
    if pixie_core.tool_count() <= 0:  # 起動スモーク
        raise RuntimeError("pixie_core: ツールが1つも登録されていません")

    _register_copilot_tool(pixie_core)
    _register_note_tools(pixie_core)

    _core = pixie_core
    return _core


def _register_copilot_tool(pixie_core) -> None:
    """CWP 固有の ask_copilot ツールを AWP レジストリに登録する（pack="copilot"）。

    pack 付きなので、セッションの context.active_packs に "copilot" が含まれる時だけ LLM に提示
    される（＝⚙️ 設定の on/off で制御）。実体は PrayLight subprocess を呼ぶ CWP の copilot モジュール。
    """
    from . import copilot

    @pixie_core.register_tool(
        name="ask_copilot",
        description=("Microsoft Copilot (Web) に単発質問して回答を得る。設計判断・ライブラリの用法・"
                     "エラーメッセージの解釈など、手元のコードやツールだけでは判断しづらい問いに使う。"),
        schema={
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "Copilot への質問（日本語可）"},
                "files": {"type": "array", "items": {"type": "string"},
                          "description": "参考として添付するファイルのパス（任意・ワークスペース相対可）"},
            },
            "required": ["question"],
        },
        prompt_desc="ask_copilot(question, files?): Copilot に質問して外部知識を相談（数十秒かかる）",
        pack="copilot",
    )
    def ask_copilot(question, files=None):  # noqa: ANN001 - AWP ツールは動的引数
        return copilot.ask(str(question), files or [])


def _register_note_tools(pixie_core) -> None:
    """Note モードの read 系ツールを AWP レジストリに pack="note" で登録する（NWP から移植）。

    スキーマは note_tools.TOOLS_SPEC（OpenAI 互換）を単一ソースとして流用し、実体は
    note_tools.execute_sync（同期・エラーは「エラー: …」文字列で返す契約）へ委譲する。
    pack 付きなので AWP CLI や Code モードのコアツール集合には混入しない（提示の強制は
    fixed_tool_set が行うため active_packs の設定は不要）。

    ask_copilot は登録をスキップする: TOOL_REGISTRY は名前がキーで、CWP は既に
    _register_copilot_tool が pack="copilot" で登録済み（実体は同じ copilot.ask）。
    ここで再登録すると上書きになるだけなので、Note セッションは tool_set に
    "ask_copilot" を含めることで既存登録を再利用する。
    """
    def make_impl(tool_name: str):
        def impl(**kwargs):  # noqa: ANN003 - AWP ツールは動的引数
            return note_tools.execute_sync(tool_name, kwargs)
        return impl

    for spec in note_tools.TOOLS_SPEC:
        fn = spec["function"]
        name = fn["name"]
        if name == "ask_copilot":
            continue  # 既存の pack="copilot" 登録を再利用（上記 docstring 参照）
        pixie_core.register_tool(
            name=name,
            description=fn["description"],
            schema=fn["parameters"],
            prompt_desc=f"{name}: {fn['description'][:80]}",
            pack="note",
        )(make_impl(name))


class AgentSession:
    """1会話（セッション）分の埋め込みエンジン。pixie_core.Engine を1つ保持する。

    複数インスタンスを同一プロセスで並行実行できる（state_board は pixie_core 側で ContextVar
    分離される）。ただし cwd（作業対象 workspace）はプロセス共有のため全セッション同一。
    """

    def __init__(self, core, server: dict, workspace):
        self._core = core
        self._CancelTurn = core.CancelTurn
        self._engine = core.create_engine(server, str(workspace))  # 自セッション専用の Engine

        self._approval_required = frozenset(core.DESTRUCTIVE_TOOLS) - APPROVAL_SKIP
        self.tool_count = self._engine.tool_count
        self.model_name = self._engine.model_name
        self.workspace = getattr(self._engine, "workspace", None)  # このセッションの作業フォルダ

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

    def set_copilot(self, enabled: bool) -> None:
        """このセッションで ask_copilot ツールの提示を on/off する（context.active_packs 経由）。"""
        ctx = self._engine.context
        ctx.active_packs = {"copilot"} if enabled else set()

    def cancel(self) -> None:
        self._cancel = True
        self._approval_event.set()  # 承認待ちを解放（_approve が [] を返して終了）


class NoteSession:
    """Note モード1会話分の埋め込みエンジン（NWP engine_adapter.NoteSession の移植）。

    AgentSession（Code モード）との違い:
    - **read 専用**: create_engine(tool_set=...) で read 系ツールのみを LLM に提示する
      （API 1.4 の固定プロファイル）。さらに interactive_fn（_guard）が許可外ツールを
      即時却下する多層防御。承認 UI・threading.Event 待機は持たない（承認するものが無い）。
    - **編集プロトコル**: search/replace・apply ブロックの指示（NOTE_SYSTEM_SUFFIX）を
      create_engine(system_suffix=...) で静的に注入する。エディタ反映は従来どおり
      フロントの差分プレビュー → ユーザーのクリックで行う（エージェントは書かない）。
    - **イベント契約**: CWP フロントの {"type": "token"/"status"/"error"} 形式で emit する
      （NWP の {"t"}/{"s"} 形式ではない）。
    - **単一セッション**: ワークスペース1本＝会話1本（get_note_session / reset_note_session）。
    """

    def __init__(self, core, server: dict, workspace: str, copilot_enabled: bool):
        self._core = core
        self._CancelTurn = core.CancelTurn
        self._allowed = self._allowed_set(copilot_enabled)
        self._engine = core.create_engine(
            server, workspace,
            tool_set=self._allowed,
            system_suffix=NOTE_SYSTEM_SUFFIX,
        )
        self.workspace = getattr(self._engine, "workspace", workspace)
        self.model_name = self._engine.model_name

        # ターン実行の排他（1セッション1ターン）。main.py が非ブロッキングで取得する。
        self.busy = threading.Lock()
        self.seeded = False  # サイドカー履歴からのシード済みフラグ（セッション生成後の初回のみ）

        # ターン単位の状態。
        self._emit_event = None
        self._cancel = False

    @staticmethod
    def _allowed_set(copilot_enabled: bool) -> frozenset:
        return frozenset(NOTE_TOOLS | ({"ask_copilot"} if copilot_enabled else set()))

    def seed_history(self, messages: list[dict]) -> None:
        """サイドカー保持の履歴（.pixie_chat.json 由来）で LLM 文脈をシードする（初回のみ）。

        直近8件は NWP（llm.build_messages の history[-8:]）と同じ上限。"""
        if messages:
            self._engine.load_history(messages[-8:])
        self.seeded = True

    def set_copilot(self, enabled: bool) -> None:
        """ask_copilot の提示を on/off する。次ターン（次の run_turn）から反映される。"""
        self._allowed = self._allowed_set(enabled)
        self._engine.context.fixed_tool_set = self._allowed

    # ---- ターン実行（worker スレッドで呼ばれる） ----
    def run_turn(self, user_text: str, emit_event) -> None:
        self._emit_event = emit_event
        self._cancel = False
        try:
            self._engine.run_turn(
                user_text,
                output_fn=self._emit,
                interactive_fn=self._guard,
                show_thinking=settings.show_thinking,
            )
        except self._CancelTurn:
            emit_event({"type": "status", "text": "⏹ 中断しました。"})
        except Exception as e:  # worker の例外は SSE に流して握る（ハング防止）
            emit_event({"type": "error", "text": f"{type(e).__name__}: {e}"})

    # ---- output_fn: engine → SSE イベント分類（AgentSession と同一ロジックを共有） ----
    _emit = AgentSession._emit

    # ---- interactive_fn: read 専用の最終防衛線（承認 UI ではない） ----
    def _guard(self, tool_calls, content):
        """許可外ツールを即時却下する。ブロッキング待機はしない。

        fixed_tool_set が正しく効いていれば許可外の tool_call は来ないはずだが、
        「書き込みツールを一切実行させない」という Note モードの安全設計の最終層として残す
        （safe_path・read 系限定スキーマと同じ多層防御の一枚）。"""
        if self._cancel:
            return ([], None)
        approved, rejected = [], []
        for tc in tool_calls:
            (approved if _tc_name(tc) in self._allowed else rejected).append(tc)
        for tc in rejected:
            self._emit_event({"type": "status",
                              "text": f"⚠️ 許可されていないツール '{_tc_name(tc)}' を却下しました"
                                      "（Note モードは読み取り専用）"})
        return (approved, None)

    def cancel(self) -> None:
        """協調キャンセル。次の output_fn / interactive_fn 呼び出しで CancelTurn が飛ぶ。"""
        self._cancel = True


# --- Note モードの単一セッション管理（ワークスペース1本＝会話1本） ---
_note_session: NoteSession | None = None


def get_note_session() -> NoteSession:
    """現在のワークスペース・アクティブサーバに束縛した Note セッションを返す（無ければ作る）。"""
    global _note_session
    if _note_session is None:
        if _core is None:
            raise RuntimeError("pixie_core が初期化されていません（bootstrap 未実行/失敗）")
        _note_session = NoteSession(_core, config.active_server(), str(config.WORKSPACE),
                                    settings.copilot_enabled)
    return _note_session


def reset_note_session() -> None:
    """Note セッションを破棄する。契機: ワークスペース切替・履歴クリア・モデル変更・モード切替。

    実行中ターンがあれば協調キャンセルする（worker は次のコールバックで CancelTurn 脱出）。"""
    global _note_session
    s = _note_session
    _note_session = None
    if s is not None:
        s.cancel()
