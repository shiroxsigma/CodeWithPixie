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

import inspect
import json
import os
import re
import sys
import threading

from pathlib import Path

from . import config, files, note_prompts, note_tools, patch
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
#: 進捗インジケータの行頭記号。engine は上書き用の `\r` を**最初の "  ⏳ Prefill..." にだけ
#: 付けない**（行頭で上書き対象が無いため）ので、`\r` 判定だけではこれが本文へ漏れる。
#: 漏れると本文が "⏳ Prefill...AI: <think>…" になり、行頭でなくなった "AI: " も剥がれず、
#: splitThink の visible が "⏳ Prefill..." だけになって差分プレビューが空になる。
_INDICATOR_PREFIXES = ("⏳", "🧠")

def _looks_like_status_line(line: str) -> bool:
    """行頭からの文字列がツール/システム行かどうか（本文と区別する）。"""
    t = line.lstrip()
    return bool(t) and (t.startswith(_STATUS_PREFIXES) or re.match(r"^\[\d+\]", t) is not None)


class _StreamClassifier:
    """engine の output_fn が渡すチャンク列を、本文(token)とステータス行(status)に分ける。

    **行単位**で判定するのが要点。以前はチャンク単位で判定しており、
      1. 改行だけのチャンク（"\\n" は多くのモデルで単独トークン）が「空白のみ」として
         捨てられ、本文の改行が消えた
      2. 行の途中のチャンクが status プレフィックスに誤爆し、本文から丸ごと消えた
    という2つの欠落が起きていた。どちらも ```search ブロックを壊すため、差分反映が
    「見つからない」か、ファジーマッチで**別の場所に当たって差分の中身がおかしくなる**。
    本文は1文字も落とさないことが編集プロトコルの前提なので、ここは可逆であること。

    使い方: ターンごとに1つ作り、feed() の戻り（(種別, テキスト) の並び）をそのまま
    emit する。ターン終了時に flush() で組み立て途中のステータス行を出し切る。
    """

    def __init__(self):
        self._at_line_start = True   # 次の文字が行頭か（status 判定は行頭でのみ行う）
        self._pending = None         # 組み立て中のステータス行（改行が来たら確定）

    def feed(self, text: str) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        s = _ANSI.sub("", text)
        # インジケータ（"\r  🧠 Thinking...  " のような端末の行上書き）は本文ではない。
        # 判定に生の "\r" を使う: これがあるチャンクだけが端末制御で、本文の "Thinking..."
        # という語を誤ってステータスに送らないための識別子になる。
        if "\r" in text:
            cleaned = s.replace("\r", "").strip()
            if cleaned and any(h in cleaned for h in _INDICATOR_HINTS):
                return [("status", cleaned)]
            s = s.replace("\r", "")
        while s:
            if self._pending is not None:      # ステータス行を組み立て中
                nl = s.find("\n")
                if nl < 0:
                    self._pending += s
                    break
                self._pending += s[:nl]
                out.append(("status", self._pending.strip()))
                self._pending, self._at_line_start = None, True
                s = s[nl + 1:]
                continue
            if self._at_line_start:
                # `\r` 無しで来た行頭インジケータ。改行が来ないので _pending 経路に入れると
                # 後続の本文まで飲み込む。チャンク全体を status にして行頭のまま次へ渡す。
                head = s.lstrip()
                if "\n" not in s and head.startswith(_INDICATOR_PREFIXES):
                    out.append(("status", head.strip()))
                    break
                # "AI: " は engine が各プランステップの本文頭に付ける飾り。行頭でのみ剥がす。
                if s.startswith("AI: "):
                    s = s[4:]
                    continue
                if s in ("AI:", "AI"):         # 分割されて届いた場合
                    break
                if _looks_like_status_line(s):
                    self._pending = ""         # 次のループでステータス経路へ
                    continue
            nl = s.find("\n")
            piece, s = (s, "") if nl < 0 else (s[:nl + 1], s[nl + 1:])
            self._at_line_start = piece.endswith("\n")
            out.append(("token", piece))       # 空白のみでも落とさない（改行は本文の一部）
        return out

    def flush(self) -> list[tuple[str, str]]:
        """改行で終わらなかったステータス行を出し切る（ターン終了時）。"""
        if self._pending:
            line, self._pending = self._pending.strip(), None
            if line:
                return [("status", line)]
        self._pending = None
        return []


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
- 同じツール呼び出しが2回連続で同じエラーになった場合は、そのツールの再呼び出しをやめる。
  手持ちの情報で進めるか、足りない点をユーザーに伝えて指示を仰ぐ（同じ呼び出しの反復は禁止）。
- 必要な情報が揃ったら、ツールを呼ばずに最終回答を書く。ツール結果の丸写しではなく、依頼に沿って整理する。
- 推測でパスを書かない。実在確認できたファイルだけを参照する。
- 「現在エディタで開いているファイル」がメッセージに添付されている場合、その内容は未保存の編集を含む最新版。
  同じファイルを read_note で読み直さない（ディスク上の古い内容が返る）。
- ファイルへの書き込み・削除・コマンド実行はできない。変更はすべて上記の search/replace / apply
  ブロックで提案し、反映はユーザーに委ねる。

長い文書の段階的な執筆（複数ファイルのまとめ等、長い新規 Markdown を作る依頼）:
- 一度の回答で全文を書き上げようとしない。ローカルモデルは出力がトークン上限で
  途中で途切れることがあり、そのターンに進めた分がすべて無駄になるため。
- 第1ターン: まず**骨子だけ**を書く — タイトル・見出しの全構造・各セクション
  1行のプレースホルダ（例「（ここに config.py の役割を記述）」）。ファイルがまだ
  存在しなければ、ユーザーに空の .md を作って開いてもらうよう先に伝える。
- 第2ターン以降: 1ターンに1〜3セクションずつ、プレースホルダを search/replace で
  本文に置き換えて埋めていく。ユーザーが区切りよく確認・適用できる粒度に保つ。
- 各ターンの終わりに「次はどのセクションを埋めるか」を1行で示す。
"""
)


#: Plan モードで LLM に提示する調査系ツール。pixie_core.READONLY_TOOLS（副作用なしと
#: AWP が保証している集合）から、この用途に無関係な manga_identify_cover を除いたもの。
#: リテラルで持つのは、bootstrap 前（＝pixie_core を import する前）に参照できる形にして
#: 「書き込みツールが混ざっていないこと」をテストで静的に検証できるようにするため
#: （READONLY_TOOLS の部分集合であることもテストで突き合わせる）。
PLAN_TOOLS = frozenset({
    "get_cwd", "get_file_dir", "list_directory", "read_file",
    "grep_search", "get_code_outline", "analyze_file",
    "query_whiteboard", "inspect_tool", "view_tree",
    "research_code_paths",
    # 委譲サブエージェントも読み取り専用（pixie_core.DELEGATE_SUBAGENT_TOOLS）なので
    # 計画立案の調査に使ってよい。
    "delegate_research",
})

#: pixie_core の base システムプロンプト末尾に足す静的指示（Plan モード）。セッション内不変。
#: 計画本文を ```plan フェンスで囲ませるのは、フロントが「計画」と「調査の説明」を確実に
#: 切り分けて左ペインの承認ビューへ出すため（見出しや箇条書きの体裁に頼ると取り違える）。
PLAN_SYSTEM_SUFFIX = """
# 計画モード（最重要・このセクションが他の指示より優先される）
あなたはコードベースを調べて「実行計画」を立てる担当です。実装は行いません。

守ること:
- ファイルの作成・変更・削除、コマンド実行は一切できない（そのためのツールは提示されていない）。
  「修正しました」のような実行済みの言い方をせず、これから何をするかだけを書く。
- まず read_file / grep_search / list_directory / view_tree などで、変更対象と影響範囲を実際に確認する。
  推測でパスを書かない。実在を確認できたファイルだけを計画に載せる。
- 調べ終わったら、日本語の番号付きリストで実行手順を書く。1手順＝1つのまとまった作業とし、
  「どのファイルを」「どう変えるか」「なぜそうするか」が読んで分かる粒度にする。
  最後の手順には確認方法（テスト・動作確認）を入れる。
- 判断が要る点・前提が不確かな点があれば、計画の後に「確認したいこと」として短く挙げる。

出力の形式（重要・アプリはこのブロックだけを取り出して承認ボタンと一緒に表示する）:
最終的な計画は必ず ```plan フェンスで囲む。フェンスの中は計画本文だけにし、挨拶や調査ログを
混ぜない。1回の返答にフェンスは1つだけ。

```plan
1. …（手順）
2. …（手順）
```
"""


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


# ---- 承認時の差分プレビュー計算 ------------------------------------------------
#: 差分プレビューの上限。超えるものはスキップ（SSE の肥大化・メモリ防止）。
_PREVIEW_MAX_BYTES = 1_000_000   # 読み込む既存ファイルのサイズ上限
_PREVIEW_MAX_CHARS = 300_000     # before/after 文字列の長さ上限


def _read_preview_base(path: str) -> str | None:
    """プレビュー用に書き換え対象の現在内容を読む。
    未存在 → ""（新規ファイル）、読めない（バイナリ・巨大・権限等）→ None（preview 見送り）。
    ここに来る path はエンジンがディスパッチ境界で絶対化したもの（相対で来ても
    config.WORKSPACE 基準で解決を試みる＝ベストエフォート）。"""
    p = Path(path)
    if not p.is_absolute():
        p = (config.WORKSPACE / p).resolve()
    try:
        if not p.exists():
            return ""
        if not p.is_file() or p.stat().st_size > _PREVIEW_MAX_BYTES:
            return None
        text = p.read_text(encoding="utf-8")  # strict: バイナリは UnicodeDecodeError → None
        if len(text) > _PREVIEW_MAX_CHARS:
            return None
        return text
    except (OSError, UnicodeDecodeError):
        return None


def _tool_preview(name: str, args: dict) -> dict | None:
    """承認対象の書き込み系ツールについて、実行前後のファイル内容を計算する
    （{"path", "before", "after"} — 承認ビューが左ペインの差分エディタで表示する）。

    計算は AWP のツール実装と一致させる: search_and_replace は app/patch.py（AWP の
    _fuzzy_apply 移植・3層ファジー）、replace_lines は _compute_replace_lines_content
    （1オリジン・両端含む・範囲クランプ）の再現。計算できないものは None を返し、
    承認バーは従来どおり引数全文表示にフォールバックする。"""
    if not isinstance(args, dict):
        return None
    try:
        if name == "write_file":
            path = str(args.get("path") or "")
            after = args.get("content")
            if not path or not isinstance(after, str):
                return None
            before = _read_preview_base(path)
            if before is None or len(after) > _PREVIEW_MAX_CHARS:
                return None
            return {"path": path, "before": before, "after": after}

        if name == "search_and_replace":
            path = str(args.get("path") or "")
            search = args.get("search_block")
            replace = args.get("replace_block")
            if not path or not isinstance(search, str) or not isinstance(replace, str):
                return None
            before = _read_preview_base(path)
            if before is None:
                return None
            res = patch.apply_edits(before, [{"search": search, "replace": replace}])
            if not res["applied"]:
                return None  # マッチしない＝ツール側も失敗するので、紛らわしい差分は出さない
            return {"path": path, "before": before, "after": res["content"]}

        if name == "replace_lines":
            path = str(args.get("path") or "")
            new_content = args.get("new_content")
            if not path or not isinstance(new_content, str):
                return None
            before = _read_preview_base(path)
            if before is None:
                return None
            start = int(args.get("start_line"))
            end = int(args.get("end_line"))
            lines = before.splitlines(keepends=True)
            # AWP _compute_replace_lines_content と同じガード（範囲外ならツールも失敗）
            if start < 1 or start > len(lines) or end < start:
                return None
            prefix = lines[: start - 1]
            suffix = lines[min(end, len(lines)):]
            new_lines = new_content.splitlines(keepends=True)
            if new_content and new_lines and not new_content.endswith(("\n", "\r\n")):
                new_lines[-1] = new_lines[-1] + "\n"
            return {"path": path, "before": before, "after": "".join(prefix + new_lines + suffix)}
    except (ValueError, TypeError, OSError):
        return None
    return None


# --- プロセス1回だけの AWP ブートストラップ（全セッション共有） ---
_core = None  # 読み込んだ pixie_core モジュール（キャッシュ）

#: pixie_core が履歴編集 API（1.6）を持つか。持たない AWP でも従来どおり動かし、
#: 「往復の削除」「/compact」だけを無効化する（bootstrap が判定して立てる）。
HISTORY_API = False


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
    global HISTORY_API
    HISTORY_API = (major, minor) >= (1, 6)
    if (major, minor) < (1, 4):
        raise RuntimeError(f"pixie_core API 1.4 以上が必要です（現在: {ver or '?'}）。"
                           "AnythingWithPixie を更新してください。")
    if pixie_core.tool_count() <= 0:  # 起動スモーク
        raise RuntimeError("pixie_core: ツールが1つも登録されていません")

    _register_copilot_tool(pixie_core)
    _register_note_tools(pixie_core)

    _core = pixie_core
    # 設定の思考許容時間をエンジンへ反映（API 1.5 未満なら黙って既定値のまま動く）。
    apply_think_budget(settings.think_budget_sec)
    return _core


def stream_timeout_sec(budget_sec) -> float:
    """思考許容時間に見合う LLM ストリーム打ち切り秒。

    overall_timeout（既定 180）は思考も生成もまとめて打ち切るため、思考許容時間だけ伸ばしても
    こちらに先に引っかかって意味がない。思考の後に結論生成の時間が要るので +60 秒の余裕を足す
    （既定 180 秒を下回らせない）。"""
    return max(180.0, float(budget_sec) + 60.0)


def apply_think_budget(seconds, sessions=()) -> int:
    """思考許容時間をエンジンへ反映する（プロセス全体＋生きているセッションのストリーム上限）。

    pixie_core.set_think_budget はプロセス全体（engine のモジュール変数）に効くが、
    LLM ストリームの打ち切り秒はセッション（＝Engine）ごとなので、既存セッションには
    個別に適用する。新規セッションは構築時に自分で適用する。

    API 1.5 未満の pixie_core では何もしない（設定画面は出るが効かない、で止める）。"""
    v = int(seconds)
    if _core is None or not hasattr(_core, "set_think_budget"):
        return v
    v = _core.set_think_budget(v)
    timeout = stream_timeout_sec(v)
    for s in (*sessions, _note_session, _plan_session):
        if s is not None:
            s.set_stream_timeout(timeout)
    return v


def _apply_context_length(engine, server: dict) -> None:
    """アクティブサーバに手動コンテキスト長が設定されていれば、バックエンドの n_ctx を上書きする。

    リモート LM Studio / llama-server は /v1/models に meta.n_ctx を返さず、バックエンドが
    32768 にフォールバックする。エンジンは get_total_context(llm)=llm.n_ctx() で窓長を測り
    切り詰め・チェックポイントを決めるので、実窓長とズレると溢れる。ここで生成直後に
    backend._n_ctx を実測値へ差し替える（pixie_core 本体は非改変。private 属性だが、
    LMStudioBackend.n_ctx() が返すのはこの値なので、これで get_total_context に効く）。"""
    n = 0
    try:
        n = int(server.get("context_length") or 0)
    except (TypeError, ValueError):
        n = 0
    if n <= 0:
        return  # 0 = 自動（バックエンドが取得した値／フォールバックのまま）
    try:
        llm = engine.context.llm
        if hasattr(llm, "_n_ctx"):
            llm._n_ctx = n
    except Exception:  # noqa: BLE001 - 上書きに失敗しても自動値で動作は続く
        pass


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
    def make_impl(tool_name: str, properties: dict):
        def impl(**kwargs):  # noqa: ANN003 - AWP ツールは動的引数
            return note_tools.execute_sync(tool_name, kwargs)
        # pixie_core のツールディスパッチ（tools.py の _execute_builtin_tool）は登録関数の
        # 署名を inspect して引数を検証する。**kwargs だけの関数だと唯一の仮引数 "kwargs" が
        # 「必要な引数」扱いになり、あらゆる呼び出しが「Error: 必要な引数 'kwargs' が不足
        # しています。」で死ぬ（LLM には 'kwargs' という引数が見えないので自己修正できず、
        # 永遠にリトライし続ける）。そこでスキーマの引数名から明示的な署名を組み立てて付ける。
        # 全引数をオプショナル（既定 None）にするのは、必須引数の不足は execute_sync 内の
        # _require が検出して、LLM に修正可能なエラー文で返す設計のため（二重検証の回避）。
        impl.__signature__ = inspect.Signature([
            inspect.Parameter(p, inspect.Parameter.POSITIONAL_OR_KEYWORD, default=None)
            for p in properties
        ])
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
        )(make_impl(name, fn["parameters"].get("properties", {})))


class HistoryOps:
    """会話履歴の編集（pixie_core API 1.6）。Code / Note / Plan の全セッション共通。

    目的は**コンテキストの節約**: 回答が不要だった往復を LLM 文脈から外す（drop_turn）、
    会話を要約1件に畳んで続きへ引き継ぐ（replace_history）。

    要点は「ターンを index ではなくメッセージ**オブジェクトの同一性**で覚える」こと。
    エンジンは長い会話を自動トリム（古い側を先頭から落とす）するので、index で覚えると
    後からずれて別のターンを消してしまう。begin_turn/end_turn で1往復ぶんのメッセージを
    ハンドルとして掴んでおき、削除時にそれを渡す。

    1ターン（＝1回の HTTP チャット要求）の中で run_turn が複数回走る経路がある
    （/copilot は 組み立て・反映 の2回）。そこで境界は run_turn ではなく
    begin_turn/end_turn で切る — ユーザーから見た1往復が、消すときの1単位になる。
    """

    #: 表示用に覚えておくユーザー発言の長さ（/context の一覧で往復を見分けられれば十分）。
    TURN_LABEL_CHARS = 60

    def _init_turns(self) -> None:
        """コンストラクタから呼ぶ（このクラスは __init__ を持たない mixin）。"""
        self.turns: list[dict] = []   # [{"id", "label", "start", "handles"}]
        self._turn_seq = 0
        self._open_turn: dict | None = None

    @property
    def _history_ok(self) -> bool:
        # _engine を getattr で見るのは、このクラスを素の mixin として（Engine を持たない
        # テストダブルにも）混ぜられるようにするため。持たなければ履歴編集は単に無効。
        return HISTORY_API and hasattr(getattr(self, "_engine", None), "history_size")

    def begin_turn(self, label: str = "") -> int:
        """1往復の記録を開始し、そのターン ID を返す（0 なら履歴編集は使えない）。"""
        if not self._history_ok:
            return 0
        self._turn_seq += 1
        self._open_turn = {
            "id": self._turn_seq,
            "label": (label or "").strip()[:self.TURN_LABEL_CHARS],
            "start": self._engine.history_size(),
            "handles": [],
        }
        return self._turn_seq

    def end_turn(self) -> None:
        """開始後にエンジンが積んだメッセージをこのターンのハンドルとして確定する。

        必ず呼ぶこと（例外・中断時も）。呼ばないと次のターンの start がずれ、
        削除時に前のターンまで巻き込む。
        """
        t, self._open_turn = self._open_turn, None
        if t is None:
            return
        t["handles"] = self._engine.history_tail(t["start"])
        if t["handles"]:          # 何も積まれなかったターン（即エラー等）は記録しない
            self.turns.append(t)

    def drop_turn(self, turn_id: int) -> int:
        """指定ターンのメッセージを LLM 文脈から取り除く。除去件数（未知の ID なら -1）。"""
        if not self._history_ok:
            return -1
        for i, t in enumerate(self.turns):
            if t["id"] == int(turn_id):
                removed = self._engine.history_drop(t["handles"])
                self.turns.pop(i)
                return removed
        return -1

    def last_turn_id(self) -> int:
        """直近ターンの ID（/undo 用）。記録が無ければ 0。"""
        return self.turns[-1]["id"] if self.turns else 0

    def replace_history(self, messages: list[dict]) -> bool:
        """履歴を丸ごと差し替える（/compact の引き継ぎ）。ターン記録も作り直す。"""
        if not self._history_ok:
            return False
        self._engine.history_replace(messages)
        self.turns.clear()        # 旧ハンドルはもう履歴に無い（消しても何も起きない）
        self._open_turn = None
        return True

    def history_stats(self) -> dict:
        """/context 用の概算。文字数はメッセージを JSON 化した長さで測る
        （ツール結果・tool_calls の引数も文脈を食うため、本文だけでは実態と合わない）。"""
        if not self._history_ok:
            return {"supported": False, "messages": 0, "chars": 0, "turns": []}
        msgs = self._engine.history_tail(0)
        chars = sum(len(json.dumps(m, ensure_ascii=False)) for m in msgs)
        return {
            "supported": True,
            "messages": len(msgs),
            "chars": chars,
            "turns": [{"id": t["id"], "label": t["label"],
                       "chars": sum(len(json.dumps(m, ensure_ascii=False))
                                    for m in t["handles"])}
                      for t in self.turns],
        }


class AgentSession(HistoryOps):
    """1会話（セッション）分の埋め込みエンジン。pixie_core.Engine を1つ保持する。

    複数インスタンスを同一プロセスで並行実行できる（state_board は pixie_core 側で ContextVar
    分離される）。ただし cwd（作業対象 workspace）はプロセス共有のため全セッション同一。
    """

    def __init__(self, core, server: dict, workspace):
        self._core = core
        self._CancelTurn = core.CancelTurn
        self._engine = core.create_engine(server, str(workspace))  # 自セッション専用の Engine
        _apply_context_length(self._engine, server)  # 手動コンテキスト長（設定時のみ）
        self.set_stream_timeout(stream_timeout_sec(settings.think_budget_sec))

        self._approval_required = frozenset(core.DESTRUCTIVE_TOOLS) - APPROVAL_SKIP
        self.tool_count = self._engine.tool_count
        self.model_name = self._engine.model_name
        self.workspace = getattr(self._engine, "workspace", None)  # このセッションの作業フォルダ

        # ターン実行の排他（1セッション）。main.py が非ブロッキングで取得する。
        self.busy = threading.Lock()
        self._init_turns()  # 往復の記録（削除・/compact 用。HistoryOps）

        # 承認の相関 ID とイベント。
        self._approval_event = threading.Event()
        self._approval_decision: dict | None = None
        self._approval_id = 0
        self._pending_id = 0

        # ターン単位の状態。
        self._emit_event = None
        self._cancel = False
        self._classifier = _StreamClassifier()

    # ---- ターン実行（worker スレッドで呼ばれる） ----
    def run_turn(self, message: str, emit_event, approval_timeout: float = 0.0) -> None:
        self._emit_event = emit_event
        self._cancel = False
        self._classifier = _StreamClassifier()  # 行分類の状態はターンをまたがない
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
            self._emit_flush()
            changed = files.diff_changed(before)
            if changed:
                emit_event({"type": "files_changed", "paths": changed})

    # ---- output_fn: engine → SSE イベント分類 ----
    def _emit(self, text, end="", flush=False):
        if self._cancel:
            raise self._CancelTurn()
        if not text:
            return
        for kind, out in self._classifier.feed(text):
            self._emit_event({"type": "token" if kind == "token" else "status", "text": out})

    def _emit_flush(self) -> None:
        """ターン終了時に分類器の残り（改行で終わらなかったステータス行）を出す。"""
        for kind, out in self._classifier.flush():
            self._emit_event({"type": "token" if kind == "token" else "status", "text": out})

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
        calls_view = []
        for tc in tool_calls:
            name = _tc_name(tc)
            args = _tc_args(tc)
            entry = {"name": name, "args": args, "needs_approval": name in self._approval_required}
            # 書き込み系は「実行するとどう変わるか」の差分を添える（承認ビューが左ペインに
            # 表示する）。計算できないもの（対象外ツール・巨大ファイル等）は従来どおり引数表示だけ。
            if entry["needs_approval"]:
                preview = _tool_preview(name, args)
                if preview:
                    entry["preview"] = preview
            calls_view.append(entry)
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

    def set_plan_phase(self, on: bool) -> None:
        """Code モードの plan-first サブモード: on の間だけ提示ツールを読み取り専用
        （PLAN_TOOLS）に制限し、off で通常の Code ツール一式に戻す（fixed_tool_set=None
        → pixie_core の code_mode 既定）。ターン境界での変更は pixie_core がサポートする
        方法（set_copilot の active_packs 変更と同じ契約）。

        計画フェーズのターンはこの制限下で ```plan フェンスの計画だけを出し、承認後
        フロントが計画を次の指示として送り直すことで、フルツールの通常ターンに移る。
        """
        self._engine.context.fixed_tool_set = frozenset(PLAN_TOOLS) if on else None

    def set_stream_timeout(self, overall: float) -> None:
        """LLM ストリームの打ち切り秒（思考許容時間に追随させる）。API 1.5 未満では無視。"""
        setter = getattr(self._engine, "set_stream_timeout", None)
        if setter is not None:
            setter(overall)

    def cancel(self) -> None:
        self._cancel = True
        self._approval_event.set()  # 承認待ちを解放（_approve が [] を返して終了）


class NoteSession(HistoryOps):
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

    ツール集合とシステム指示はクラス属性 TOOLS / SYSTEM_SUFFIX で持つ。読み取り専用
    プロファイルは Note 以外にも要る（Plan モード）ので、差し替え点をここ1箇所にまとめ、
    PlanSession はこのクラスを継承して2つの属性だけを差し替える。
    """

    #: LLM に提示する固定ツール集合（サブクラスで差し替える）。
    TOOLS = NOTE_TOOLS
    #: base システムプロンプト末尾へ静的に足す指示（サブクラスで差し替える）。
    SYSTEM_SUFFIX = NOTE_SYSTEM_SUFFIX

    def __init__(self, core, server: dict, workspace: str, copilot_enabled: bool):
        self._core = core
        self._CancelTurn = core.CancelTurn
        self._allowed = self._allowed_set(copilot_enabled)
        self._engine = core.create_engine(
            server, workspace,
            tool_set=self._allowed,
            system_suffix=self.SYSTEM_SUFFIX,
        )
        _apply_context_length(self._engine, server)  # 手動コンテキスト長（設定時のみ）
        self.workspace = getattr(self._engine, "workspace", workspace)
        self.model_name = self._engine.model_name
        self.set_stream_timeout(stream_timeout_sec(settings.think_budget_sec))

        # ターン実行の排他（1セッション1ターン）。main.py が非ブロッキングで取得する。
        self.busy = threading.Lock()
        self._init_turns()  # 往復の記録（削除・/compact 用。HistoryOps）
        self.seeded = False  # サイドカー履歴からのシード済みフラグ（セッション生成後の初回のみ）

        # ターン単位の状態。
        self._emit_event = None
        self._cancel = False
        self._classifier = _StreamClassifier()

    @classmethod
    def _allowed_set(cls, copilot_enabled: bool) -> frozenset:
        return frozenset(cls.TOOLS | ({"ask_copilot"} if copilot_enabled else set()))

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

    #: LLM ストリーム打ち切り秒の設定（AgentSession と同一実装を共有）。
    set_stream_timeout = AgentSession.set_stream_timeout

    # ---- ターン実行（worker スレッドで呼ばれる） ----
    def run_turn(self, user_text: str, emit_event) -> None:
        self._emit_event = emit_event
        self._cancel = False
        self._classifier = _StreamClassifier()  # 行分類の状態はターンをまたがない
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
        finally:
            self._emit_flush()  # 改行で終わらなかったステータス行を出し切る

    # ---- output_fn: engine → SSE イベント分類（AgentSession と同一ロジックを共有） ----
    _emit = AgentSession._emit
    _emit_flush = AgentSession._emit_flush

    # ---- interactive_fn: read 専用の最終防衛線（承認 UI ではない） ----
    def _guard(self, tool_calls, content):
        """許可外ツールを即時却下する。ブロッキング待機はしない。

        fixed_tool_set が正しく効いていれば許可外の tool_call は来ないはずだが、
        「書き込みツールを一切実行させない」という読み取り専用モード（Note / Plan）の
        安全設計の最終層として残す（safe_path・read 系限定スキーマと同じ多層防御の一枚）。"""
        if self._cancel:
            return ([], None)
        approved, rejected = [], []
        for tc in tool_calls:
            (approved if _tc_name(tc) in self._allowed else rejected).append(tc)
        for tc in rejected:
            self._emit_event({"type": "status",
                              "text": f"⚠️ 許可されていないツール '{_tc_name(tc)}' を却下しました"
                                      "（このモードは読み取り専用）"})
        return (approved, None)

    def cancel(self) -> None:
        """協調キャンセル。次の output_fn / interactive_fn 呼び出しで CancelTurn が飛ぶ。"""
        self._cancel = True


class PlanSession(NoteSession):
    """Plan モード1会話分の埋め込みエンジン（読み取り専用プロファイル）。

    NoteSession との違いはツール集合とシステム指示だけなので継承で差し替える
    （承認 UI を持たないこと・_guard で許可外ツールを即時却下することは同じ性質であり、
    二重実装すると片方だけ直る事故になる）。「承認するまでファイルは1字も変えない」は
    ここで担保する: 書き込みツールをそもそも LLM に提示しないので、承認する対象が無い。

    seed_history / set_copilot も継承するが、計画の会話はサイドカーに永続化しない
    （計画はその場のもので、承認したら Code モードの最初の指示になって役目を終える）。
    """

    TOOLS = PLAN_TOOLS
    SYSTEM_SUFFIX = PLAN_SYSTEM_SUFFIX


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


def peek_note_session() -> "NoteSession | None":
    """生きている Note セッションを返す（無ければ None。作らない）。

    「今ある会話の文脈を見る/削る」用途では、無いなら無いで正しい（文脈が空ということ）。
    そこで get_ を呼ぶと、見るだけのはずが空セッションを作ってしまう。"""
    return _note_session


def reset_note_session() -> None:
    """Note セッションを破棄する。契機: ワークスペース切替・履歴クリア・モデル変更・モード切替。

    実行中ターンがあれば協調キャンセルする（worker は次のコールバックで CancelTurn 脱出）。"""
    global _note_session
    s = _note_session
    _note_session = None
    if s is not None:
        s.cancel()


# --- Plan モードの単一セッション管理（Note と同じく会話1本） ---
_plan_session: PlanSession | None = None


def get_plan_session() -> PlanSession:
    """現在のワークスペース・アクティブサーバに束縛した Plan セッションを返す（無ければ作る）。"""
    global _plan_session
    if _plan_session is None:
        if _core is None:
            raise RuntimeError("pixie_core が初期化されていません（bootstrap 未実行/失敗）")
        _plan_session = PlanSession(_core, config.active_server(), str(config.WORKSPACE),
                                    settings.copilot_enabled)
    return _plan_session


def peek_plan_session() -> "PlanSession | None":
    """生きている Plan セッションを返す（無ければ None。作らない）。peek_note_session と同趣旨。"""
    return _plan_session


def reset_plan_session() -> None:
    """Plan セッションを破棄する。契機は Note と同じ（ワークスペース切替・モード切替等）。

    特にモード切替では必ず捨てる: 承認して Code へ移ったあと Plan へ戻ったとき、
    実装済みの前提を引きずった計画を立てさせないため。"""
    global _plan_session
    s = _plan_session
    _plan_session = None
    if s is not None:
        s.cancel()
