"""Note モード用エージェントツール群。ワークスペース限定の read 系 + Copilot 相談。

NoteWithPixie/app/tools.py の read 系（TOOLS_SPEC / execute_sync とその補助）を移植した
もの（Stage C）。二重実装。統一まで NWP 側と両方を同期修正すること。

セキュリティ方針: 書き込み系ツールは登録しない。エディタへの反映は従来どおり
search/replace / ```apply ブロック → 差分プレビュー → ユーザーのクリックで行う
（エージェントが取得、人間が反映）。

NWP 版との差分:
- import を CWP のモジュール（files/search/config）に合わせた。
- ask_copilot の実体は CWP 既存の copilot.ask()（PrayLight 同期 subprocess）を再利用する。
  NWP の _run_praylight_sync/_ask_copilot_sync 相当は copilot.py が担うため移植しない
  （相対パスは pixie_core の workspace ContextVar 基準で解決される — run_turn 中は
  セッションの workspace に束縛済み）。
- legacy agent 用の async execute() / url2md / open_browser 系は移植しない
  （pixie_core はツールを worker スレッドから同期呼び出しするため execute_sync が正）。
"""
from __future__ import annotations

import logging

from . import copilot, extract, files, mdflow, search
from .config import settings

logger = logging.getLogger(__name__)

# OpenAI 互換 function calling スキーマ（pixie_core への登録の単一ソース）
TOOLS_SPEC: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "list_workspace",
            "description": "ワークスペース内のファイル一覧（相対パスとサイズ）を取得する。どんなファイルがあるか分からないときに最初に使う。",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_note",
            "description": "ワークスペース内のファイルの中身を読む。pptx/docx/xlsx/pdf はテキスト抽出して返す。path には list_workspace や grep_workspace が返す相対パスを渡す。",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "ワークスペースからの相対パス（例: ideas/plot.md）"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "grep_workspace",
            "description": "ワークスペースの全テキストファイルからキーワードを検索し、マッチした行を path:line: text 形式で返す。どのファイルに書いたか探すときに使う。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "検索キーワード（大文字小文字は区別しない）"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "describe_flows",
            "description": (
                "ノート内の Mermaid フローチャートと条件マッピング（mdflow）の構造を要約して返す。"
                "図ID・ノードID一覧・プリセット（when 式と active_nodes）・選択中プリセット・整合性の警告が分かる。"
                "フローや条件プリセットの編集を頼まれたら、まずこれで現状を把握する。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "ワークスペースからの相対パス（例: specs/login.md）"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ask_copilot",
            "description": (
                "Microsoft Copilot（Web版）に1回質問して回答を得る。最新情報・外部知識・推敲の別視点が欲しいときだけ使う。"
                "応答に数十秒かかるので乱用しない。Copilot はこの会話もワークスペースも見えないため、"
                "必要な文脈・本文はすべて question に含めるか、files でファイルごと添付すること。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "Copilot への質問文（自己完結した文章にする）"},
                    "files": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Copilot に添付するファイルのパス（任意・複数可）。ワークスペース内は相対パス、"
                            "ユーザーが関連ファイルとして添付したものは提示された絶対パスをそのまま渡す。"
                            "長い文書やあなたが読めない形式を読ませたいときに使う。対応: md/txt/csv/pdf/docx/xlsx/pptx/画像等"
                        ),
                    },
                },
                "required": ["question"],
            },
        },
    },
]


def _truncate(text: str, limit: int | None = None) -> str:
    limit = limit or settings.tool_result_max_chars
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n…（長いため以降 {len(text) - limit} 文字を省略）"


def _require(args: dict, key: str) -> str:
    """LLM が必須引数を省いた場合に、そのまま返せるメッセージで ValueError にする。
    args[key] を直接引かないのは、KeyError を「引数不足」と「実装バグ」の両方に
    使ってしまうと後者が前者に化けて隠れるため。"""
    v = args.get(key)
    if v is None or (isinstance(v, str) and not v.strip()):
        raise ValueError(f"必須引数 '{key}' がありません。")
    return str(v)


def _read_note(rel: str) -> str:
    """ワークスペース内ファイルの本文を返す。Office 系（pptx/docx/xlsx/pdf）は
    Markdown へテキスト抽出する。抽出不可・サイズ超過は ValueError →
    execute_sync() が「エラー: …」文字列に変換する。"""
    p = files.safe_path(rel)
    if p.suffix.lower() in extract.SUPPORTED_EXTS:
        if not p.is_file():
            raise FileNotFoundError(rel)
        # NWP の refs/read・GET /api/file と同じ 50MB 枠（テキスト上限とは別）
        if p.stat().st_size > extract.MAX_OFFICE_BYTES:
            raise ValueError("ファイルが大きすぎます（50MB 超）")
        return extract.extract_text(p)
    if not files.is_text(rel):
        # .png 等を errors="replace" で読むと置換文字の羅列になり LLM の文脈を汚すだけ。
        # 弾いて自己修正可能なエラー文にする。
        raise ValueError(
            f"この形式（{p.suffix or '拡張子なし'}）はテキストとして読めません。"
        )
    return files.read_file(rel)


def _format_entry(f: dict) -> str:
    """list_files() の1件を1行に。dir には size が無い（files.list_files 参照）。"""
    if f.get("type") == "dir":
        return f"{f['path']}/"
    return f"{f['path']} ({f['size']} bytes)"


def execute_sync(name: str, args: dict) -> str:
    """ツールを実行して結果文字列を返す（同期コア）。失敗も例外でなく文字列で返し、LLM に自己修正させる。

    pixie_core エンジンはツールを worker スレッドから同期呼び出しするため同期が正。
    subprocess.run 等のブロッキング呼び出しも worker スレッド上なのでそのまま使える。"""
    try:
        if name == "list_workspace":
            items = files.list_files()["files"]  # truncated はツール結果では無視（agent は read/grep で辿れる）
            if not items:
                return "（ワークスペースは空です）"
            return _truncate("\n".join(_format_entry(f) for f in items))
        if name == "read_note":
            return _truncate(_read_note(_require(args, "path")))
        if name == "grep_workspace":
            hits = search.search(_require(args, "query"))
            if not hits:
                return "（マッチなし）"
            return _truncate("\n".join(f"{h['path']}:{h['line']}: {h['text']}" for h in hits))
        if name == "describe_flows":
            return _truncate(mdflow.describe(_read_note(_require(args, "path"))))
        if name == "ask_copilot":
            if not settings.copilot_enabled:
                return "エラー: Copilot モードがオフです。設定でオンにしてください。"
            # 実体は CWP 既存の copilot.ask()（PrayLight 同期 subprocess・エラーは文字列契約）
            return _truncate(copilot.ask(_require(args, "question"), args.get("files") or []))
        return f"エラー: 不明なツール '{name}'"
    except FileNotFoundError as e:
        return f"エラー: ファイルが見つかりません: {e}。list_workspace で実在するパスを確認してください。"
    except ValueError as e:
        return f"エラー: {e}"
    except Exception as e:  # noqa: BLE001
        # 想定外はアプリ側のバグ。ここで握らないと呼び出し元の SSE ストリームごと落ちるが、
        # LLM の入力ミスに見せかけると原因が追えなくなるので「バグ」と明示して返す。
        logger.exception("note tool %s failed", name)
        return f"エラー: ツール '{name}' の内部エラー（{type(e).__name__}: {e}）。これはアプリ側のバグです。"
