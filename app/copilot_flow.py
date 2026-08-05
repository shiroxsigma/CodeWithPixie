"""`/copilot` のオーケストレーション（組み立て → 質問 → 反映）。

`/copilot` はもともと「ユーザー文＋選択範囲＋参考ファイルを連結して Copilot に投げ、
回答を表示する」だけの直行経路だった。それだと (1) これまでの会話で分かったことが
質問に入らない (2) 回答がコードに反映されない、の2点で使いどころが限られる。

ここではエージェント（ローカル LLM）を両端に立てて1ターンを3フェーズにする:

  1. **組み立て** — 現セッションのエージェントに「これまでの調査を踏まえ、Copilot への
     自己完結した質問文を書け」と依頼する。手元に無い情報は read/grep で補ってよい。
     出力は ````copilot-question フェンス1つ（本文の抽出点を一意にするため）。
  2. **質問** — 抽出した質問文を copilot.ask() へ渡す（PrayLight 同期 subprocess）。
  3. **反映** — 回答を同じセッションへ戻し、事実確認のうえ採否を判断させて修正させる。
     どう反映されるかはモードのプロファイル次第（Code=編集ツール＋承認、
     Note/Plan=編集ブロック → 差分プレビュー）。ここではモード分岐しない。

フェーズ1と3は同一セッション・同一 busy ロックの中で走るので、Copilot の回答は
会話履歴に残り、以降のターンの文脈としても効く。

`/copilot_simple`（別名 `/copilot!`）は、ローカル LLM を一切通さない直行経路
（main._copilot_direct）として残してある。
"""
from __future__ import annotations

import re

from . import config, copilot

#: Copilot の入力欄が極端な長文を弾くため、質問文はここで頭打ちにする（従来と同値）。
QUESTION_MAX_CHARS = 15_000

#: 組み立てフェーズで LLM に出させるフェンス名。````（4つ）を基本にするのは、質問文の中に
#: ```python 等のコードフェンスが入るのが普通だから（3つだと最初の内側フェンスで閉じる）。
QUESTION_FENCE = "copilot-question"

#: チャットへ echo する際に無害化する編集プロトコルのフェンス名。Copilot の回答や質問文に
#: これらが混ざると、フロント（edit-blocks.js）が「エージェントの編集提案」と誤認して
#: 差分プレビューに載せてしまう — echo は読み物であって提案ではない。
_PROTOCOL_FENCES = ("search", "replace", "apply", "plan")
_PROTOCOL_FENCE_RE = re.compile(
    r"^(\s*)```(" + "|".join(_PROTOCOL_FENCES) + r")\s*$", re.MULTILINE)


def _neutralize(text: str) -> str:
    """チャットへ echo するテキストから、フロントが解釈してしまう記法を抜く。

    - 編集プロトコルのフェンス名 → ```text（差分プレビューへ吸われないように）
    - <think> → ‹think›（splitThink が echo 以降を全部「思考」として捨てるのを防ぐ）
    """
    text = _PROTOCOL_FENCE_RE.sub(r"\1```text", text)
    return text.replace("<think>", "‹think›").replace("</think>", "‹/think›")


def build_compose_prompt(user_ask: str) -> str:
    """フェーズ1の指示文（各モードの素材組み立てに「# 指示」として載せる）。

    質問の精度はここでほぼ決まる。効くと分かっている点を明示している:
    Copilot 側にワークスペースが見えないこと・推測でコードを書かないこと・
    回答形式を質問文の中で指定させること（そうしないと散文が返ってきて反映できない）。
    """
    ask = user_ask.strip() or (
        "これまでの会話で扱っている課題について、Copilot に助言を求めたい"
        "（何を聞くべきかもあなたが判断すること）。")
    return f"""# 今回の依頼: 外部 Copilot への質問文を作る（このターンでは実装しない）
ユーザーが `/copilot` を使いました。あなたの仕事は、外部の Microsoft Copilot に投げる
**自己完結した質問文を1つ作ること**です。ファイルの変更・コマンド実行はこのターンでは行いません。
（Copilot への送信はアプリが行うので、ask_copilot ツールは使わないこと。）

ユーザーの指示:
{ask}

前提（ここを外すと回答が使い物になりません）:
- Copilot は**この会話もこのワークスペースも一切見えません**。ファイル名・関数名・
  「さっきのエラー」と書いても向こうには何も伝わりません。必要なものは全部本文に書く。
- Copilot は最新の外部知識・一般論に強く、このコードベースの事情は知りません。
  「このプロジェクトではどう書くべきか」ではなく「一般にどうするのが定石か」を聞く。

手順:
1. これまでの会話で何が分かっていて、何が分かっていないかを整理する。
   聞くべきことは「まだ分かっていないこと」であって、既に判明していることではない。
2. 質問に貼るコードや事実が手元に無ければ、read_file / grep_search などで**実物を確認する**。
   記憶や推測でコードを書かない（存在しないコードについて助言をもらっても無駄になる）。
3. 下の形式で質問文を書く。

質問文に必ず入れるもの:
- **背景**: 何を作っていて、今どこで詰まっているか（3行以内）。
- **関連コードの実物**: 判断に要る箇所だけを抜粋して貼る。ファイルパスを見出しにし、
  言語つきフェンスで囲む。全文を貼らない — 関係する関数・クラスに絞る。
- **制約**: 言語/フレームワーク/バージョン、変えられない前提、既に試して駄目だった方法。
- **聞きたいこと**: 1つの疑問文で明確に。複数あるなら箇条書きで最大3つまで。
- **回答形式の指定**: 「該当箇所の修正後のコードを、ファイルごとにフェンスで示してください」
  のように、そのまま反映できる形を指定する。

出力の形式（重要・アプリはこのフェンスの中身だけを Copilot へ送ります）:
最終出力は ````{QUESTION_FENCE} フェンス（バッククォート4つ）**1つだけ**。
フェンスの中は Copilot へそのまま送る文章だけにし、こちらへの説明・挨拶・調査ログを混ぜない。
質問文の中でコードを囲むときは通常の ```（3つ）を使ってよい。
全体で {QUESTION_MAX_CHARS:,} 文字以内に収める。

````{QUESTION_FENCE}
（ここに Copilot への質問文）
````
"""


def build_apply_prompt(user_ask: str, answer: str) -> str:
    """フェーズ3の指示文（あなたが書いた質問への回答が届いた、という体で戻す）。

    「参考意見であって事実ではない」と明示するのが要点。Copilot はこのコードベースを
    見ていないので、存在しない API や別バージョンの書き方を自信満々に返してくる。
    そのまま貼らせると壊れる。
    """
    ask = user_ask.strip() or "（指示は特に無し。会話の流れから判断すること）"
    return f"""# あなたが作った質問への、外部 Copilot からの回答が届きました

--- Copilot の回答（ここから）---
{answer}
--- Copilot の回答（ここまで）---

ユーザーの元の指示: {ask}

扱い方（重要）:
- これは**このコードベースを見ていない外部の意見**です。事実確認はあなたの責任。
  実在しない API・別バージョンの書き方が混ざることがあるので、採用する前に
  read_file / grep_search で実物と突き合わせる。食い違う部分は採用しない。
- 採用できる部分だけを、**このプロジェクトの既存の書き方に合わせて**反映する。
  回答の文章やコードをそのまま貼り付けない。
- 成果物が長い文書（複数ファイルの Markdown まとめ等）になる場合、**一度のターンで
  全文を書き上げようとしない**。このターンでは骨子（タイトル・見出しの全構造・
  各セクション1行のプレースホルダ）だけを作り、以降のターンで1〜3セクションずつ
  埋めていく。ローカルモデルは出力がトークン上限で途切れると、そのターンの進捗が
  すべて失われるため。
- 反映すべき点が無い / 回答が的外れ / 前提が違う場合は、無理に変更せずそう伝える。
- 最後に「採用した点」と「採用しなかった点と理由」を1〜3行で述べる。

では、この回答を踏まえて元の指示に応えてください。
"""


def extract_question(text: str) -> str:
    """フェーズ1の応答から質問文（````copilot-question フェンスの中身）を取り出す。

    バッククォート3つ以上を受け付け、閉じは**開いたのと同じ数以上**の行で判定する
    （そうしないと質問文の中の ```python で閉じてしまう）。閉じが無いまま応答が
    終わった場合は以降すべてを質問文とみなす（打ち切られただけで中身は使えるため）。
    フェンスがまったく無いときは "" を返す — 説明文をそのまま Copilot へ送るより、
    呼び出し側でエラーにして作り直させるほうが安全。
    """
    lines = text.split("\n")
    open_re = re.compile(r"^\s*(`{3,})" + re.escape(QUESTION_FENCE) + r"\s*$")
    for i, line in enumerate(lines):
        m = open_re.match(line)
        if not m:
            continue
        close_re = re.compile(r"^\s*`{" + str(len(m.group(1))) + r",}\s*$")
        for j in range(i + 1, len(lines)):
            if close_re.match(lines[j]):
                return "\n".join(lines[i + 1:j]).strip()
        return "\n".join(lines[i + 1:]).strip()
    return ""


def run(sess, *, compose_text: str, user_ask: str, attach_files: list[str],
        emit, approval_timeout: float = 0.0) -> None:
    """3フェーズを1ターンとして実行する（worker スレッドから呼ばれる）。

    sess は現在のモードのセッション（AgentSession / NoteSession / PlanSession）。
    run_turn のシグネチャが Code だけ approval_timeout を取るので吸収する。
    emit は _turn_stream の emit（{"type": ...} を SSE へ流す）。
    """
    def turn(text: str, sink) -> None:
        if approval_timeout and hasattr(sess, "resolve_approval"):
            sess.run_turn(text, sink, approval_timeout)
        else:
            sess.run_turn(text, sink)

    def status(text: str) -> None:
        emit({"type": "status", "text": text})

    def cancelled() -> bool:
        """クライアント切断・中断ボタン（sess.cancel）を検知する。

        フェーズ間で必ず見る: run_turn は入口で _cancel を False に戻すので、
        Copilot 待ちの数十秒の間に切断されても、見ないまま次のフェーズへ入ってしまう。
        """
        return bool(getattr(sess, "_cancel", False))

    # 組み立て中は ask_copilot を伏せる。この経路自体が Copilot への質問なので、
    # 途中で勝手にもう一度聞かれると数十秒を二重に払ったうえ質問が二重になる。
    sess.set_copilot(False)
    try:
        # --- フェーズ1: 質問文の組み立て ---
        status("🕊️ /copilot: これまでの調査から Copilot への質問を組み立てています…")
        body: list[str] = []
        def compose_sink(ev: dict) -> None:
            # 本文はチャットに出さず溜める（下書きと調査ログで会話が埋まるため）。
            # ツール実行などの status / error はそのまま見せる。
            if ev.get("type") == "token":
                body.append(ev.get("text") or "")
            else:
                emit(ev)

        turn(compose_text, compose_sink)
        if cancelled():
            return  # 中断済み（run_turn 側が "⏹ 中断しました。" を出している）

        question = extract_question("".join(body))
        if not question:
            emit({"type": "error",
                  "text": f"Copilot への質問文を組み立てられませんでした"
                          f"（````{QUESTION_FENCE} フェンスが応答に含まれていません）。"
                          "もう一度試すか、`/copilot_simple` で直接質問してください。"})
            return
        if len(question) > QUESTION_MAX_CHARS:
            question = question[:QUESTION_MAX_CHARS] + "\n…（長いため以降を省略）"

        emit({"type": "token",
              "text": f"### 🕊️ Copilot への質問（{len(question):,} 文字）\n\n"
                      f"{_neutralize(question)}\n\n"})

        # --- フェーズ2: Copilot へ質問 ---
        files_note = f"・添付 {len(attach_files)} 件" if attach_files else ""
        status(f"🕊️ Copilot に送信しました。回答を待っています（数十秒{files_note}）…")
        # PrayLight の進捗（アップロード中／完了など）をそのまま status に流す。
        # 添付付きは数分かかることがあり、無通知だと固まったように見えるため。
        answer = copilot.ask(question, attach_files,
                             on_progress=lambda line: status(f"🕊️ {line}"))
        if cancelled():
            status("⏹ 中断しました（Copilot の回答は破棄されました）。")
            return
        if answer.startswith("エラー"):
            status(f"⚠️ {answer.splitlines()[0][:160]}")
            emit({"type": "error", "text": answer})
            return

        emit({"type": "token",
              "text": f"### 🕊️ Copilot の回答\n\n{_neutralize(answer)}\n\n---\n\n"})

        # --- フェーズ3: 回答を精査して反映 ---
        status("🕊️ 回答を精査して反映します…")
        turn(build_apply_prompt(user_ask, answer), emit)
    finally:
        # 次のターンでは通常どおりエージェントの判断で ask_copilot を使えるように戻す。
        try:
            sess.set_copilot(config.settings.copilot_enabled)
        except Exception:  # noqa: BLE001 - 復旧処理でターンを落とさない
            pass
