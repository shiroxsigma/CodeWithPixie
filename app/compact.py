"""`/compact` — 会話を要約して文脈を畳み、そのまま続きを話せるようにする。

長い会話は「文脈が詰まる」以外にも実害がある: エンジンの自動トリムが古い側から
メッセージを落とすので、最初に決めた前提や制約が静かに消える。要約して置き換えれば、
消えるのが「やりとりの逐語」だけになり、決定事項は残る。

やること（1ターン）:
  1. 現セッションのエージェントに、これまでの会話の引き継ぎメモを書かせる（ツール不使用）。
  2. 得た要約で履歴を丸ごと置き換える（pixie_core API 1.6 の history_replace）。
     置き換え後の履歴は「要約を伝えるユーザー発言」＋「了解したという返事」の2件だけ。

置き換えを LLM 自身の返答としてではなく**ユーザー発言側**に載せるのは、以降のターンで
モデルがこれを「自分が前に言ったこと」ではなく「与えられた前提」として扱うようにするため。
"""
from __future__ import annotations

import re

#: 要約の抽出点を一意にするフェンス（`/copilot` の質問フェンスと同じ考え方）。
SUMMARY_FENCE = "summary"

#: 要約が長すぎると畳んだ意味が無くなるので頭打ちにする。
SUMMARY_MAX_CHARS = 6000


def build_prompt(focus: str) -> str:
    """要約フェーズの指示文。focus は `/compact <焦点>` でユーザーが足した観点（任意）。"""
    focus_line = (f"\nユーザーからの指定: 「{focus.strip()}」に関わることは特に落とさないこと。\n"
                  if focus.strip() else "")
    return f"""# 今回の依頼: これまでの会話を要約して引き継ぐ（このターンでは実装しない）
ユーザーが `/compact` を使いました。この会話の記録はこの後**あなたの要約だけに置き換わり**、
逐語のやりとりは失われます。あなた自身が続きを迷わず進められるメモを書いてください。
ファイルの変更・コマンド実行・ツールの呼び出しはこのターンでは行いません（会話の中身だけで書く）。
{focus_line}
必ず残すもの（消えると続きが破綻する）:
- **目的**: 何をしようとしている作業か。
- **決定事項と前提**: 合意した方針、選ばなかった案とその理由、変えてはいけない制約。
- **調べて分かった事実**: 触ったファイルのパスと役割、判明した仕組み・原因。推測と事実を混ぜない。
- **やったこと**: 既に変更・作成したファイルと、その変更内容の要点。
- **残っていること**: 次にやる作業、未解決の問題、確認待ちの点。

書き方:
- 日本語の箇条書き。見出しは上の5項目をそのまま使う。
- ファイル名・関数名・エラーメッセージなど**具体名は省略せずに書く**（後で検索できる形で残す）。
- 挨拶・感想・「要約します」等の前置きは書かない。
- 会話に出てこなかったことを足さない。分からないことは「未確認」と書く。
- 全体で {SUMMARY_MAX_CHARS:,} 文字以内。

出力の形式（重要・アプリはこのフェンスの中身だけを引き継ぎます）:
最終出力は ```{SUMMARY_FENCE} フェンス**1つだけ**。フェンスの外には何も書かない。

```{SUMMARY_FENCE}
## 目的
…
```
"""


def extract_summary(text: str) -> str:
    """応答から ```summary フェンスの中身を取り出す。

    フェンスが無いときは本文全体を要約とみなす（前置きが混ざっても、失って困るのは
    「要約が取れずに /compact が失敗すること」のほう。逐語の履歴はまだ消していないので
    危険は無く、ユーザーは中身を読んで判断できる）。
    """
    open_re = re.compile(r"^\s*(`{3,})" + re.escape(SUMMARY_FENCE) + r"\s*$")
    lines = text.split("\n")
    for i, line in enumerate(lines):
        m = open_re.match(line)
        if not m:
            continue
        close_re = re.compile(r"^\s*`{" + str(len(m.group(1))) + r",}\s*$")
        for j in range(i + 1, len(lines)):
            if close_re.match(lines[j]):
                return "\n".join(lines[i + 1:j]).strip()
        return "\n".join(lines[i + 1:]).strip()
    return text.strip()


def handoff_messages(summary: str) -> list[dict]:
    """要約後の履歴（これだけが次のターンの文脈になる）。"""
    return [
        {"role": "user",
         "content": "（これまでの会話は長くなったため要約に置き換えました。以下がここまでの"
                    "経緯です。逐語の記録はもうありません。この前提の続きから進めてください。）\n\n"
                    + summary},
        {"role": "assistant",
         "content": "承知しました。上の要約を前提として続けます。"},
    ]


def run(sess, *, focus: str, emit, approval_timeout: float = 0.0) -> None:
    """要約 → 履歴置換を1ターンとして実行する（worker スレッドから呼ばれる）。

    sess は現在のモードのセッション（AgentSession / NoteSession / PlanSession）。
    emit は _turn_stream の emit（{"type": ...} を SSE へ流す）。
    """
    if not getattr(sess, "_history_ok", False):
        emit({"type": "error",
              "text": "このエンジンでは /compact を使えません"
                      "（pixie_core API 1.6 以上が必要です。AnythingWithPixie を更新してください）。"})
        return

    before = sess.history_stats()
    if before["messages"] < 2:
        emit({"type": "status", "text": "まだ畳むほどの会話がありません。"})
        return

    emit({"type": "status",
          "text": f"/compact: これまでの会話（{before['messages']}件・"
                  f"約 {before['chars']:,} 文字）を要約しています…"})

    body: list[str] = []

    def sink(ev: dict) -> None:
        # 要約の下書きはチャットに流さない（確定版を後でまとめて1件出す）。
        if ev.get("type") == "token":
            body.append(ev.get("text") or "")
        else:
            emit(ev)

    if approval_timeout and hasattr(sess, "resolve_approval"):
        sess.run_turn(build_prompt(focus), sink, approval_timeout)
    else:
        sess.run_turn(build_prompt(focus), sink)

    if getattr(sess, "_cancel", False):
        return  # 中断済み（run_turn 側が "⏹ 中断しました。" を出している）

    summary = extract_summary("".join(body))
    if len(summary) > SUMMARY_MAX_CHARS:
        summary = summary[:SUMMARY_MAX_CHARS] + "\n…（長いため以降を省略）"
    if not summary:
        emit({"type": "error",
              "text": "要約を作れませんでした（応答が空です）。履歴はそのままにしました。"})
        return

    messages = handoff_messages(summary)
    sess.replace_history(messages)
    after = sess.history_stats()
    saved = before["chars"] - after["chars"]

    emit({"type": "token", "text": f"### 会話を要約しました\n\n{summary}\n"})
    emit({"type": "status",
          "text": f"文脈を {before['messages']}件 → {after['messages']}件"
                  f"（約 {saved:,} 文字ぶん節約）に畳みました。"})
    # フロントはこれを見てチャット欄と保存履歴を要約1件に差し替える（表示と文脈の一致点）。
    emit({"type": "compacted", "summary": summary,
          "before": before["messages"], "after": after["messages"], "saved_chars": saved})
