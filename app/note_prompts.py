"""Note モードのプロンプト素材とユーザーテキスト組み立て。

NoteWithPixie/app/llm.py の IDENTITY / EDIT_PROTOCOL / MDFLOW_PROMPT / build_user_text を
移植したもの（Stage C）。二重実装。統一まで NWP 側と両方を同期修正すること。
httpx 依存のストリーミングクライアント（stream_chat / list_models）は移植しない —
LLM 接続は pixie_core（AWP）の LMStudioBackend が担う。
"""
from __future__ import annotations

from .config import settings

# --- プロンプト設計 --------------------------------------------------------------
# 修正案は必ず search/replace / ```apply フェンスで囲わせる。フロントはこのブロックだけを
# 抽出して差分プレビュー → 人間のクリックで反映するため、挨拶や解説がエディタへ混入しない。
IDENTITY = """あなたは Markdown エディタに常駐する執筆支援アシスタント（Pixie）です。
ユーザーはエディタで文章の一部を選択していることがあります。

"""

EDIT_PROTOCOL = """回答のルール:
- まず日本語で、何をどう変えたか / 提案の意図を簡潔に説明する。
- 編集の提案は、次の2形式のどちらかで返す（説明文の中に混ぜない）:

【形式1: 部分編集（推奨・複数箇所可）】本文の変更したい箇所ごとにペアで書く:
```search
<本文中に実在するテキストを一字一句そのままコピー（省略・要約禁止）>
```
```replace
<その箇所の置換後テキスト>
```
- search には対象箇所を一意に特定できるだけの行を含める（前後の行を足してよい）。
- 削除は replace を空にする。複数箇所ならペアを複数並べる。

【形式2: 全置換】選択範囲が短い・全体を書き直す場合のみ:
```apply
<置換後の Markdown 本文のみ。挨拶・解説を含めない>
```

- 重要: unified diff（`+`/`-` 行、```diff）は絶対に出力しない。差分表示はアプリが行う。
- 「差分を出して」と言われても、説明は日本語の文で述べ、実体は上の2形式で返すこと。
- 純粋な相談・質問への回答なら、どのブロックも付けない。
- 参考ファイルが与えられたら内容を踏まえるが、無い情報を創作しない。
"""

# mdflow（条件別フロー可視化）の文法ガイド。pixie 経路（engine_adapter の
# NOTE_SYSTEM_SUFFIX）では常時静的に含める（prefix cache 保護のため条件注入しない）。
MDFLOW_PROMPT = """
# mdflow（条件別フロー可視化）の扱い
このノートには Mermaid フローチャートと条件マッピングが含まれることがある。書式:
- 図: ```mermaid ブロックの先頭行に `%% id: 図ID` を書く（flowchart のみ対応）。
- 条件: ```mdflow-mapping ブロック（YAML）。例:
  diagram: flow-login
  presets:
    管理者・正常:
      when: 'role == "admin" && error_count == 0'
      active_nodes: [A, B, D]
  style:
    active: 'fill:#ff9999,stroke:#333,stroke-width:2px'
- when 式に使えるのは && || ! == != < <= > >= と数値・文字列・true/false だけ（関数呼び出し不可）。
- active_nodes には図に実在するノードIDだけを書く。図のノードを消したら active_nodes からも消す。
- 「今どのプリセットを選択中か」は frontmatter の `mdflow: selected: {図ID: プリセット名}`。
  プリセットの定義は本文の mdflow-mapping に書く（frontmatter に定義を書かない）。
- プリセットや図の追加・変更を頼まれたら、該当ブロックを【形式1: 部分編集】の
  search/replace で編集する。
"""

# 参考ファイル1件あたりの上限文字数。ローカルモデルのコンテキスト長（~32k トークン）を
# 静かに溢れさせないための保険。超過分は切り詰めて明示する。
MAX_CONTEXT_CHARS_PER_FILE = 8000


def build_user_text(user_msg: str, selection: str, context_files: list[dict],
                    current_file: str = "", current_content: str = "",
                    attach_files: list[str] | None = None) -> str:
    """フロントから来た素材を1本のユーザーテキストに組み立てる（コンテキスト予算管理込み）。

    pixie_core 経路では動的文脈をユーザーメッセージに載せる設計（静的指示は
    system_suffix）。attach_files はユーザーが明示添付した関連ファイルの絶対パス
    （.pptx 等、ローカル LLM は読めない形式）で、ask_copilot への添付案内に使う。"""
    budget = settings.context_char_budget  # ファイル素材の総量上限（超過分は参考ファイルを省略）
    parts: list[str] = []
    if current_file:
        content = current_content
        if len(content) > MAX_CONTEXT_CHARS_PER_FILE:
            content = content[:MAX_CONTEXT_CHARS_PER_FILE] + "\n…（長いため以降を省略）"
        budget -= len(content)  # 現在ファイルは常に含める（選択範囲・指示も同様）
        parts.append(
            f"# 現在エディタで開いているファイル: {current_file}\n"
            "（ユーザーが「このファイル」「今のファイル」「開いているファイル」と言う場合はこれを指す。"
            "内容は未保存の編集を含む最新のもの）\n"
            f"```\n{content}\n```"
        )
    # 開いているファイルは重複させない（上のセクションが未保存編集込みで最新）
    others = [f for f in context_files if f["path"] != current_file]
    if others:
        included: list[str] = []
        omitted: list[str] = []
        for f in others:
            content = f["content"]
            if len(content) > MAX_CONTEXT_CHARS_PER_FILE:
                content = content[:MAX_CONTEXT_CHARS_PER_FILE] + "\n…（長いため以降を省略）"
            if len(content) > budget:
                omitted.append(f["path"])
                continue
            budget -= len(content)
            included.append(f"## {f['path']}\n```\n{content}\n```")
        if included:
            parts.append("# 参考ファイル")
            parts.extend(included)
        if omitted:
            parts.append(
                "# 注記\nコンテキスト上限のため次の参考ファイルは本文を省略した"
                "（必要なら個別に参照するよう指示すること）: " + ", ".join(omitted)
            )
    if selection.strip():
        parts.append("# エディタで選択中のテキスト\n```markdown\n" + selection + "\n```")
    if attach_files:
        listing = "\n".join(f"- {p}" for p in attach_files)
        parts.append(
            "# ユーザーが添付した関連ファイル\n"
            "（.pptx など、あなた自身は読めない形式を含む。内容の参照が必要なときは "
            "ask_copilot の files に下記の絶対パスをそのまま渡すこと）\n" + listing
        )
    parts.append("# 指示\n" + user_msg)
    return "\n\n".join(parts)
