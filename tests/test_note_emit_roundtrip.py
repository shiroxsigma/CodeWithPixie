"""_emit（output_fn → SSE 分類）が本文をロスレスに運べるかの再現テスト。

search/replace ブロックは1文字でも欠けると exact マッチが外れるため、
「engine が流したチャンク列」→「token イベントの結合」が元テキストと
一致することが反映機能の前提条件になる。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import engine_adapter  # noqa: E402


class _EmitHarness:
    """NoteSession.__init__ を通さず _emit だけを検証するための骨組み。"""

    _cancel = False

    class _Cancel(Exception):
        pass

    _CancelTurn = _Cancel

    def __init__(self):
        self.events = []
        self._emit_event = self.events.append
        # 行分類の状態はターン単位。実物では run_turn が作り直す。
        self._classifier = engine_adapter._StreamClassifier()

    _emit = engine_adapter.NoteSession._emit

    @property
    def body(self) -> str:
        return "".join(e["text"] for e in self.events if e["type"] == "token")


#: LLM が出す典型的な編集提案（LF）。
SAMPLE = """ノートを直します。

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


def _chunks_like_llm(text: str) -> list[str]:
    """LM Studio 等が返す粒度に近い分割: 改行は単独チャンクになりやすい。"""
    out = []
    for line in text.splitlines(keepends=True):
        if line.endswith("\n"):
            body = line[:-1]
            if body:
                out.append(body)
            out.append("\n")  # 改行だけのチャンク（BPE では極めて普通）
        else:
            out.append(line)
    return out


def test_emit_preserves_body_exactly():
    """改行のみのチャンクを含むストリームでも token 結合が原文と一致すること。"""
    h = _EmitHarness()
    for c in _chunks_like_llm(SAMPLE):
        h._emit(c)
    assert h.body == SAMPLE


def test_emit_preserves_body_with_blockwise_chunks():
    """1〜3文字の細切れでも原文が復元できること。"""
    h = _EmitHarness()
    for i in range(0, len(SAMPLE), 3):
        h._emit(SAMPLE[i:i + 3])
    assert h.body == SAMPLE


def test_emit_keeps_whitespace_only_chunk():
    """改行だけのチャンクが token として出ること（最小再現）。"""
    h = _EmitHarness()
    h._emit("a")
    h._emit("\n")
    h._emit("\n")
    h._emit("b")
    assert h.body == "a\n\nb"
