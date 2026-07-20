"""`/copilot`（! なし）= 組み立て → 質問 → 反映 のオーケストレーションのテスト。

LLM も PrayLight も呼ばない: セッションは「run_turn で決め打ちのトークンを emit する」
偽物に差し替え、copilot.ask はモンキーパッチする。検証するのは経路の契約:
フェーズ順・質問文がフェンスから取り出されること・組み立て中の下書きがチャットへ
漏れないこと・Copilot の回答が次のターンのプロンプトに入ること。
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import copilot, copilot_flow, engine_adapter, main, mode  # noqa: E402
from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app, base_url="http://127.0.0.1")


def events(resp) -> list[dict]:
    out = []
    for part in resp.text.split("\n\n"):
        line = part.strip()
        if line.startswith("data:"):
            out.append(json.loads(line[len("data:"):].strip()))
    return out


class FakeSession(engine_adapter.HistoryOps):
    """run_turn がスクリプト済みの応答を返すだけのセッション。"""

    def __init__(self, replies):
        self.replies = list(replies)
        self.prompts: list[str] = []
        self.copilot_calls: list[bool] = []
        self.busy = __import__("threading").Lock()
        self.seeded = True
        self._cancel = False
        self._init_turns()  # _turn_stream が往復を記録する（Engine 無しなので実質 no-op）

    def set_copilot(self, enabled):
        self.copilot_calls.append(enabled)

    def run_turn(self, text, emit, approval_timeout=0.0):
        self.prompts.append(text)
        reply = self.replies.pop(0) if self.replies else ""
        emit({"type": "status", "text": "🔧 read_file(...)"})
        emit({"type": "token", "text": reply})


COMPOSED = """考えました。

````copilot-question
FastAPI の SSE で困っています。

```python
def gen():
    yield "x"
```

どう直すのが定石ですか？
````
"""


@pytest.fixture()
def wired(monkeypatch):
    """Code モードで、偽セッションを返すマネージャに差し替える。"""
    monkeypatch.setattr(settings, "copilot_enabled", True)
    monkeypatch.setattr(mode, "current_mode", lambda: "code")
    monkeypatch.setattr(main.mode, "current_mode", lambda: "code")
    sess = FakeSession([COMPOSED, "採用しました。"])
    monkeypatch.setattr(main, "_manager", type("M", (), {
        "get_or_create": staticmethod(lambda sid: sess),
    })())
    return sess


def chat(message: str, **kw) -> list[dict]:
    body = {"message": message, "session_id": "s-test"}
    body.update(kw)
    return events(client.post("/api/chat", json=body))


def test_three_phases_in_order(wired, monkeypatch):
    seen = {}

    def fake_ask(question, files=None):
        seen["q"] = question
        seen["files"] = files
        return "こう直すと良いです。"

    monkeypatch.setattr(copilot, "ask", fake_ask)
    evs = chat("/copilot SSE が途中で切れる", attach_files=["D:/tmp/a.pptx"])
    texts = [e.get("text", "") for e in evs]

    # 質問文はフェンスの中身だけが Copilot へ渡る（前後の「考えました。」は入らない）
    assert seen["q"].startswith("FastAPI の SSE で困っています。")
    assert "考えました。" not in seen["q"]
    assert 'yield "x"' in seen["q"]  # 内側の ```python で閉じない
    assert seen["files"] == ["D:/tmp/a.pptx"]

    # 組み立てフェーズの本文（下書き）はチャットへ出さない。ツール status は出す。
    assert not any("考えました。" in t for t in texts)
    assert any("read_file" in t for t in texts)

    # 質問 → 回答 → 反映の順に token が並び、最後は done
    tokens = [e["text"] for e in evs if e["type"] == "token"]
    assert "Copilot への質問" in tokens[0]
    assert "Copilot の回答" in tokens[1] and "こう直すと良いです。" in tokens[1]
    assert tokens[2] == "採用しました。"
    assert evs[-1]["type"] == "done"

    # 反映ターンのプロンプトには Copilot の回答と元の指示が入る
    assert "こう直すと良いです。" in wired.prompts[1]
    assert "SSE が途中で切れる" in wired.prompts[1]


def test_ask_copilot_tool_is_suppressed_during_flow(wired, monkeypatch):
    """この経路自体が Copilot への質問なので、途中でツールから二重に聞かせない。"""
    monkeypatch.setattr(copilot, "ask", lambda q, files=None: "回答")
    chat("/copilot 質問")
    assert wired.copilot_calls[0] is False   # 開始時に伏せる
    assert wired.copilot_calls[-1] is True   # 終了時に戻す（settings.copilot_enabled）


def test_missing_fence_is_reported_not_sent(wired, monkeypatch):
    """フェンスが無いまま送ると説明文が Copilot へ流れる。呼ばずにエラーにする。"""
    wired.replies[:] = ["フェンスを忘れた応答"]
    monkeypatch.setattr(copilot, "ask", lambda *a, **k: pytest.fail("呼ばれてはいけない"))
    evs = chat("/copilot 質問")
    assert evs[-2]["type"] == "error"
    assert "copilot-question" in evs[-2]["text"]


def test_copilot_error_stops_before_apply(wired, monkeypatch):
    """copilot.ask が「エラー: …」を返したら、反映ターンは回さない。"""
    monkeypatch.setattr(copilot, "ask", lambda q, files=None: "エラー: タイムアウトしました。")
    evs = chat("/copilot 質問")
    assert [e["type"] for e in evs if e["type"] in ("error", "done")] == ["error", "done"]
    assert len(wired.prompts) == 1  # 組み立てだけで終わる


def test_disabled_copilot_does_not_touch_session(monkeypatch):
    monkeypatch.setattr(settings, "copilot_enabled", False)
    monkeypatch.setattr(copilot, "ask", lambda *a, **k: pytest.fail("呼ばれてはいけない"))
    evs = chat("/copilot 質問")
    assert [e["type"] for e in evs] == ["error", "done"]
    assert "設定" in evs[0]["text"]


# --- 純粋関数 -------------------------------------------------------------------

def test_extract_question_handles_nested_fences():
    assert copilot_flow.extract_question(COMPOSED).endswith("どう直すのが定石ですか？")
    assert 'yield "x"' in copilot_flow.extract_question(COMPOSED)


def test_extract_question_accepts_three_backticks():
    text = "```copilot-question\n聞きたいこと\n```\n"
    assert copilot_flow.extract_question(text) == "聞きたいこと"


def test_extract_question_tolerates_unclosed_fence():
    """思考時間の打ち切りで閉じフェンスが出ないことがある。中身は使える。"""
    text = "````copilot-question\n途中まで書いた質問"
    assert copilot_flow.extract_question(text) == "途中まで書いた質問"


def test_extract_question_returns_empty_without_fence():
    assert copilot_flow.extract_question("ただの説明文です。") == ""


def test_echo_neutralizes_edit_protocol():
    """Copilot の回答に ```apply 等が混ざっても、差分プレビューへ吸わせない。"""
    out = copilot_flow._neutralize("説明\n```apply\n本文\n```\n<think>独り言</think>")
    assert "```apply" not in out and "```text" in out
    assert "<think>" not in out
