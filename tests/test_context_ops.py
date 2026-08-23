"""会話コンテキストの節約機能（往復の削除・/compact・/context）のテスト。

ここが壊れると起きること:
- ターン境界がずれる → 「この往復を消したら別の往復も消えた」。
- 削除が LLM 文脈に届かない → 表示だけ消えて、モデルは消したはずの話を続ける。
どちらも黙って起きる（見た目は正常）ので、境界の開閉と経路をテストで固定する。

エンジンは起動しないので、pixie_core.Engine の履歴 API だけを模した _FakeEngine を使う。
"""
import json
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import compact, engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


class _FakeEngine:
    """pixie_core API 1.6 の履歴 API だけを持つダミー（本物と同じ「同一性で消す」意味論）。"""

    def __init__(self):
        self.messages: list[dict] = []

    def history_size(self):
        return len(self.messages)

    def history_tail(self, start):
        return list(self.messages[max(0, int(start)):])

    def history_drop(self, handles):
        keep = [m for m in self.messages if not any(m is h for h in handles)]
        removed = len(self.messages) - len(keep)
        self.messages = keep
        return removed

    def history_replace(self, messages):
        self.messages = [dict(m) for m in messages]


class _FakeSession(engine_adapter.HistoryOps):
    """run_turn が「ユーザー発言＋返答」を履歴へ積むだけのセッション。"""

    def __init__(self, reply="はい"):
        self._engine = _FakeEngine()
        self.busy = threading.Lock()
        self.reply = reply
        self.prompts: list[str] = []
        self._cancel = False
        self._init_turns()

    def set_copilot(self, enabled):
        pass

    def run_turn(self, message, emit, timeout=0.0):
        self.prompts.append(message)
        self._engine.messages.append({"role": "user", "content": message})
        self._engine.messages.append({"role": "assistant", "content": self.reply})
        emit({"type": "token", "text": self.reply})


class _FakeManager:
    def __init__(self, sess):
        self._sess = sess

    def get_or_create(self, sid):
        return self._sess

    def get(self, sid):
        return self._sess

    def drop(self, sid):
        self.dropped = sid


@pytest.fixture()
def sess(monkeypatch):
    s = _FakeSession()
    monkeypatch.setattr(engine_adapter, "HISTORY_API", True)
    monkeypatch.setattr(main, "_manager", _FakeManager(s))
    monkeypatch.setattr(main.mode, "current_mode", lambda: "code")
    return s


def _chat(message, session_id="s1"):
    """1ターン投げて SSE イベントを全部集める。"""
    evs = []
    with client.stream("POST", "/api/chat",
                       json={"message": message, "session_id": session_id}) as r:
        assert r.status_code == 200
        for line in r.iter_lines():
            if line.startswith("data:"):
                evs.append(json.loads(line[len("data:"):].strip()))
    return evs


# --- ターン境界（HistoryOps） ---------------------------------------------------

def test_turn_id_is_streamed_first(sess):
    evs = _chat("こんにちは")
    assert evs[0] == {"type": "turn", "id": 1, "schema_version": 1,
                      "turn_id": 1, "sequence": 0}
    assert evs[-1] == {"type": "done", "schema_version": 1,
                       "turn_id": 1, "sequence": 2}


def test_turn_events_have_monotonic_sequence(sess):
    evs = _chat("順番")
    assert [event["sequence"] for event in evs] == list(range(len(evs)))
    assert all(event["schema_version"] == 1 for event in evs)
    assert all(event["turn_id"] == 1 for event in evs)


def test_each_turn_records_only_its_own_messages(sess):
    _chat("1つめ")
    _chat("2つめ")
    assert [t["id"] for t in sess.turns] == [1, 2]
    assert [m["content"] for m in sess.turns[1]["handles"]] == ["2つめ", "はい"]


def test_delete_removes_only_that_turn(sess):
    _chat("消す方")
    _chat("残す方")
    r = client.post("/api/chat/turn/delete", json={"session_id": "s1", "turn_id": 1})
    assert r.json() == {"ok": True, "removed": 2}
    assert [m["content"] for m in sess._engine.messages] == ["残す方", "はい"]
    assert [t["id"] for t in sess.turns] == [2]


def test_delete_is_robust_to_engine_trimming(sess):
    """自動トリムで index がずれても、狙った往復だけが消える（同一性で覚えているため）。"""
    _chat("古い")
    _chat("新しい")
    sess._engine.messages.pop(0)  # エンジンが古い側を1件落とした状況
    client.post("/api/chat/turn/delete", json={"session_id": "s1", "turn_id": 2})
    assert [m["content"] for m in sess._engine.messages] == ["はい"]


def test_delete_unknown_turn_reports_failure(sess):
    _chat("ひとつ")
    r = client.post("/api/chat/turn/delete", json={"session_id": "s1", "turn_id": 99})
    assert r.json()["ok"] is False and r.json()["removed"] == 0


def test_delete_without_session_is_success_with_nothing_removed(monkeypatch):
    """セッションが既に無いなら、消したい文脈も無い＝ユーザーから見れば成功。"""
    monkeypatch.setattr(main, "_manager", _FakeManager(None))
    monkeypatch.setattr(main.mode, "current_mode", lambda: "code")
    r = client.post("/api/chat/turn/delete", json={"session_id": "s1", "turn_id": 1})
    assert r.status_code == 200 and r.json()["removed"] == 0


def test_turn_that_adds_nothing_is_not_recorded(sess, monkeypatch):
    """何も積まずに終わったターン（送信直後のエラー等）は削除対象にしない。

    境界を閉じそこねると、次の往復が前のターンぶんまで抱えて一緒に消える。"""
    monkeypatch.setattr(sess, "run_turn",
                        lambda message, emit, timeout=0.0: emit({"type": "error", "text": "×"}))
    _chat("空振り")
    assert sess.turns == [] and sess._open_turn is None


# --- /context -------------------------------------------------------------------

def test_context_reports_size_and_turns(sess):
    _chat("なにか調べて")
    r = client.get("/api/context?session_id=s1").json()
    assert r["supported"] is True
    assert r["messages"] == 2
    assert r["chars"] > 0
    assert r["turns"][0]["label"] == "なにか調べて"
    assert r["mode"] == "code"


def test_context_without_session_is_empty(monkeypatch):
    monkeypatch.setattr(main, "_manager", _FakeManager(None))
    monkeypatch.setattr(main.mode, "current_mode", lambda: "code")
    r = client.get("/api/context?session_id=s1").json()
    assert r["messages"] == 0 and r["turns"] == []


def test_history_ops_are_inert_without_api16(sess, monkeypatch):
    """pixie_core が古い場合は機能が無効になるだけ（例外にしない）。"""
    monkeypatch.setattr(engine_adapter, "HISTORY_API", False)
    assert sess.begin_turn("x") == 0
    assert sess.drop_turn(1) == -1
    assert sess.replace_history([]) is False
    assert sess.history_stats()["supported"] is False


# --- /compact -------------------------------------------------------------------

def test_compact_replaces_history_with_summary(sess):
    sess.reply = "```summary\n## 目的\nテストを通す\n```"
    _chat("なにか")
    _chat("もうひとつ")
    evs = _chat("/compact")
    kinds = [e["type"] for e in evs]
    assert "compacted" in kinds
    ev = next(e for e in evs if e["type"] == "compacted")
    assert ev["summary"] == "## 目的\nテストを通す"
    assert ev["after"] == 2  # 引き継ぎの2件だけ
    # 逐語の履歴は残らず、要約だけが文脈になる
    contents = [m["content"] for m in sess._engine.messages]
    assert len(contents) == 2
    assert "テストを通す" in contents[0]
    assert "なにか" not in contents[0]
    assert sess.turns == []  # 旧ターンのハンドルはもう履歴に無い


def test_compact_focus_is_passed_to_the_prompt(sess):
    sess.reply = "```summary\nx\n```"
    _chat("なにか")
    _chat("/compact 認証まわり")
    assert "認証まわり" in sess.prompts[-1]


def test_compact_refuses_when_history_is_short(sess):
    evs = _chat("/compact")
    assert not any(e["type"] == "compacted" for e in evs)
    assert any("畳むほどの会話がありません" in e.get("text", "") for e in evs)


def test_compact_keeps_history_when_summary_is_empty(sess):
    sess.reply = ""
    _chat("なにか")
    evs = _chat("/compact")
    assert any(e["type"] == "error" for e in evs)
    assert any("なにか" == m["content"] for m in sess._engine.messages)


@pytest.mark.parametrize("text, expected", [
    ("```summary\n中身\n```", "中身"),
    ("前置き\n```summary\n中身\n```\n後書き", "中身"),
    ("````summary\n```py\nx\n```\n````", "```py\nx\n```"),   # 内側フェンスで閉じない
    ("```summary\n閉じ忘れ", "閉じ忘れ"),
    ("フェンス無しの本文", "フェンス無しの本文"),
])
def test_extract_summary(text, expected):
    assert compact.extract_summary(text) == expected


def test_handoff_messages_are_user_then_assistant():
    msgs = compact.handoff_messages("ようやく")
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert "ようやく" in msgs[0]["content"]


# --- /clear ---------------------------------------------------------------------

def test_session_clear_drops_the_code_session(sess, monkeypatch):
    manager = main._manager
    r = client.post("/api/session/clear", json={"session_id": "s1"})
    assert r.json() == {"ok": True, "mode": "code"}
    assert manager.dropped == "s1"


def test_session_clear_resets_the_note_session(monkeypatch):
    called = []
    monkeypatch.setattr(main.mode, "current_mode", lambda: "note")
    monkeypatch.setattr(main.engine_adapter, "reset_note_session", lambda: called.append(1))
    monkeypatch.setattr(main, "_manager", _FakeManager(None))
    r = client.post("/api/session/clear", json={"session_id": "s1"})
    assert r.json()["mode"] == "note" and called == [1]
