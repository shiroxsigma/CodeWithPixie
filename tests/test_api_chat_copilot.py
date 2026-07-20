"""/api/chat の "/copilot" 直行経路（NWP 移植）のテスト。

PrayLight の subprocess は呼ばず、copilot.ask をモンキーパッチして「経路の契約」だけを
検証する: enabled ガード・SSE イベント形式（status/token/error → done）・
「エラー: …」文字列を error イベントへ載せること。
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import copilot, main  # noqa: E402
from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app, base_url="http://127.0.0.1")


def events(resp) -> list[dict]:
    """SSE のレスポンス本文を {"type": ...} のリストへ戻す。"""
    out = []
    for part in resp.text.split("\n\n"):
        line = part.strip()
        if line.startswith("data:"):
            out.append(json.loads(line[len("data:"):].strip()))
    return out


def chat(message: str, **kw) -> list[dict]:
    body = {"message": message, "session_id": "s-test"}
    body.update(kw)
    return events(client.post("/api/chat", json=body))


@pytest.fixture()
def copilot_on(monkeypatch):
    monkeypatch.setattr(settings, "copilot_enabled", True)


def test_copilot_requires_enabled(monkeypatch):
    """オフのときはエージェントに回さず、error イベントで案内して終わる。"""
    monkeypatch.setattr(settings, "copilot_enabled", False)
    monkeypatch.setattr(copilot, "ask", lambda *a, **k: pytest.fail("呼ばれてはいけない"))
    evs = chat("/copilot 最新の RAG 事情は？")
    assert [e["type"] for e in evs] == ["error", "done"]
    assert "設定" in evs[0]["text"]


def test_copilot_direct_returns_answer(copilot_on, monkeypatch):
    seen = {}

    def fake_ask(question, files=None):
        seen["question"] = question
        seen["files"] = files
        return "Copilot の回答です。"

    monkeypatch.setattr(copilot, "ask", fake_ask)
    evs = chat("/copilot RAG の最新動向は？")
    assert [e["type"] for e in evs] == ["status", "status", "token", "done"]
    assert evs[2]["text"] == "Copilot の回答です。"
    assert seen["question"] == "RAG の最新動向は？"  # "/copilot" は剥がして渡す
    assert seen["files"] == []


def test_copilot_includes_selection_and_context(copilot_on, monkeypatch):
    """選択テキストとチェック済みファイルは、自己完結した質問文へ埋め込まれる。"""
    seen = {}

    def fake_ask(question, files=None):
        seen["q"] = question
        return "ok"

    monkeypatch.setattr(copilot, "ask", fake_ask)
    chat("/copilot これをどう思う？",
         selection="対象のテキスト",
         context_files=[{"path": "note.md", "content": "参考の中身"}],
         attach_files=["D:/tmp/deck.pptx"])
    assert "対象のテキスト" in seen["q"]
    assert "note.md" in seen["q"] and "参考の中身" in seen["q"]


def test_copilot_passes_attach_files(copilot_on, monkeypatch):
    seen = {}

    def fake_ask(question, files=None):
        seen["files"] = files
        return "ok"

    monkeypatch.setattr(copilot, "ask", fake_ask)
    chat("/copilot この資料を要約して", attach_files=["D:/tmp/deck.pptx"])
    assert seen["files"] == ["D:/tmp/deck.pptx"]


def test_copilot_error_string_becomes_error_event(copilot_on, monkeypatch):
    """copilot.ask は例外ではなく「エラー: …」文字列を返す契約。error イベントへ載せる。"""
    monkeypatch.setattr(copilot, "ask",
                        lambda q, files=None: "エラー: Copilot の応答がタイムアウトしました。")
    evs = chat("/copilot 長い質問")
    assert [e["type"] for e in evs] == ["status", "status", "error", "done"]
    assert evs[2]["text"].startswith("エラー")


def test_copilot_without_question_is_rejected(copilot_on, monkeypatch):
    """質問も選択テキストも無い「/copilot」だけの送信は、Copilot を呼ばずに案内する。"""
    monkeypatch.setattr(copilot, "ask", lambda *a, **k: pytest.fail("呼ばれてはいけない"))
    evs = chat("/copilot")
    assert [e["type"] for e in evs] == ["error", "done"]
    assert "/copilot" in evs[0]["text"]


def test_copilot_prefix_is_case_insensitive(copilot_on, monkeypatch):
    monkeypatch.setattr(copilot, "ask", lambda q, files=None: "ok")
    evs = chat("/CoPilot 大文字でも通る？")
    assert [e["type"] for e in evs] == ["status", "status", "token", "done"]


def test_long_question_is_truncated():
    """Copilot 側の入力欄が長文を弾くので、上限で切って省略を明示する。"""
    q = main._build_copilot_question("x" * 40_000, "", [])
    assert len(q) <= main.COPILOT_QUESTION_MAX_CHARS + 40
    assert q.endswith("（長いため以降は省略）")
