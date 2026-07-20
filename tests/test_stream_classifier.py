"""output_fn チャンク列 → SSE イベント分類（_StreamClassifier）の安全網。

**不変条件: 本文は1文字も落ちない。** ここが崩れると ```search ブロックが壊れ、
差分反映が「見つからない」か、ファジーマッチが別の場所に当たって差分の中身が
おかしくなる（実際に起きた不具合）。原因は
  1. 改行だけのチャンクを「空白のみ」として捨てていた
  2. 行の途中のチャンクが status プレフィックスに誤爆して本文から消えていた
の2つ。回帰させないようトークン連結の完全一致で守る。
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engine_adapter import _StreamClassifier  # noqa: E402

EDIT_MESSAGE = """ノートを直します。

```search
## 概要

ここは古い説明です。
```

```replace
## 概要

ここは新しい説明です。
```

以上です。
"""


def _run(chunks):
    """チャンク列を流し、(本文の連結, ステータス行の並び) を返す。"""
    c = _StreamClassifier()
    body, status = [], []
    for ch in chunks:
        for kind, out in c.feed(ch):
            (body if kind == "token" else status).append(out)
    for kind, out in c.flush():
        (body if kind == "token" else status).append(out)
    return "".join(body), status


def _tokenize(text):
    """改行を単独チャンクに割る（LLM ストリームの実際の来かた）。"""
    out = []
    for line in text.splitlines(keepends=True):
        if line.endswith("\n"):
            out.append(line[:-1])
            out.append("\n")
        else:
            out.append(line)
    return [c for c in out if c != ""]


def test_body_survives_newline_only_chunks():
    body, status = _run(_tokenize(EDIT_MESSAGE))
    assert body == EDIT_MESSAGE
    assert status == []


def test_body_survives_character_by_character():
    body, _ = _run(list(EDIT_MESSAGE))
    assert body == EDIT_MESSAGE


def test_blank_line_between_fences_is_kept():
    """```search の直前の空行が消えると、フェンスが行頭でなくなり抽出が外れる。"""
    body, _ = _run(["a", "\n", "\n", "```search", "\n", "x", "\n", "```", "\n"])
    assert body == "a\n\n```search\nx\n```\n"


def test_status_line_is_separated():
    body, status = _run(["🔧 read_note(path=a.md)", "\n", "本文です", "\n"])
    assert body == "本文です\n"
    assert status == ["🔧 read_note(path=a.md)"]


def test_status_prefix_midline_stays_body():
    """行の途中に現れたステータス風の文字列は本文（誤爆でこれが消えていた）。"""
    body, status = _run(["注意事項: ", "⚠️ ここは本文の一部です", "\n"])
    assert body == "注意事項: ⚠️ ここは本文の一部です\n"
    assert status == []


def test_numbered_list_is_body():
    """Markdown の "[1] 参考文献" のような行は本文（^\\[\\d+\\] の誤爆源）。"""
    body, status = _run(["文中の参照 ", "[1] ", "を見てください", "\n"])
    assert body == "文中の参照 [1] を見てください\n"
    assert status == []


def test_indicator_with_cr_is_status():
    """端末の行上書き（\\r 付き）だけをインジケータとして扱う。"""
    body, status = _run(["\r  🧠 Thinking...  ", "本文", "\n"])
    assert body == "本文\n"
    assert status == ["🧠 Thinking..."]


def test_thinking_word_in_body_is_not_status():
    """\\r を伴わない "Thinking..." は本文（語がインジケータと同じでも消さない）。"""
    body, status = _run(["Thinking... という語について", "\n"])
    assert body == "Thinking... という語について\n"
    assert status == []


def test_ai_prefix_is_stripped_at_line_start_only():
    body, _ = _run(["AI: ", "こんにちは", "\n", "AI: と書いた行", "\n"])
    # 行頭の飾りは剥がすが、2行目の "AI: " も行頭なので同様に剥がれる（従来と同じ挙動）
    assert body == "こんにちは\nと書いた行\n"


def test_flush_emits_unterminated_status_line():
    c = _StreamClassifier()
    assert c.feed("🔧 read_note(") == []      # 改行が来ないまま
    assert c.flush() == [("status", "🔧 read_note(")]
    assert c.flush() == []                     # 二重に出さない


@pytest.mark.parametrize("chunks", [
    ["```search\n", "old\n", "```\n"],
    ["```", "search", "\n", "old", "\n", "```", "\n"],
])
def test_search_fence_reaches_line_start(chunks):
    body, _ = _run(chunks)
    assert body.startswith("```search\n")
    assert "\n```\n" in body
