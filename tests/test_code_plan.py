"""Code モード plan-first サブモード（plan_first）のテスト。

LLM は呼ばず、経路の契約だけを検証する:
- AgentSession.set_plan_phase の fixed_tool_set 切替
- _code_plan_prompt の契約（依頼の埋め込み・```plan 要求・書き込みツール無し明示）
- _code_plan_phase のフェーズ切替（正常時・例外時の両方で制限が解除されること）
- /api/chat の plan_first ルーティング（計画フェーズを経る / 通常経路は素通し）
"""
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import engine_adapter, main  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app, base_url="http://127.0.0.1")


# --- set_plan_phase / フェーズ関数（エンジン不要） ---

def test_set_plan_phase_toggles_fixed_tool_set():
    """on → PLAN_TOOLS 固定、off → None（code_mode の既定ツール一式へ戻る）。"""
    class Ctx:
        fixed_tool_set = "SENTINEL"

    class Engine:
        context = Ctx()

    sess = engine_adapter.AgentSession.__new__(engine_adapter.AgentSession)
    sess._engine = Engine()
    sess.set_plan_phase(True)
    assert Engine.context.fixed_tool_set == frozenset(engine_adapter.PLAN_TOOLS)
    sess.set_plan_phase(False)
    assert Engine.context.fixed_tool_set is None


def test_plan_prompt_contract():
    p = main._code_plan_prompt("foo.py にテストを追加して")
    assert "foo.py にテストを追加して" in p      # 依頼が埋め込まれる
    assert "```plan" in p                        # 計画のフェンス要求
    assert "読み取り専用" in p                   # 書き込みツールが無いことの明示


class _FakePlanSess:
    """set_plan_phase / run_turn の呼び出し順を記録する偽セッション。"""

    def __init__(self):
        self.busy = threading.Lock()
        self.phases = []
        self.messages = []
        self.snapshots = []
        self.fail = False

    def set_copilot(self, enabled):
        pass

    def set_workspace_snapshot(self, current_file, current_content):
        self.snapshots.append((current_file, current_content))

    def set_plan_phase(self, on):
        self.phases.append(on)

    def run_turn(self, message, emit, timeout=0.0):
        self.messages.append(message)
        if self.fail:
            raise RuntimeError("boom")
        emit({"type": "token", "text": "```plan\n1. なにか\n```"})


def test_plan_phase_restores_on_success():
    sess = _FakePlanSess()
    main._code_plan_phase(sess, "依頼", lambda ev: None)
    assert sess.phases == [True, False]
    assert "実行計画" in sess.messages[0]  # 計画指示で包まれる


def test_plan_phase_restores_on_error():
    """run_turn が例外を投げてもツール制限は解除される（残留すると次ターンが読取専用に）。"""
    sess = _FakePlanSess()
    sess.fail = True
    try:
        main._code_plan_phase(sess, "依頼", lambda ev: None)
    except RuntimeError:
        pass
    assert sess.phases == [True, False]


# --- /api/chat のルーティング（manager と _turn_stream を差し替え） ---

def _route(monkeypatch, sess):
    class Mgr:
        def get_or_create(self, sid):
            return sess

        def get(self, sid):
            return sess

    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    monkeypatch.setattr(main.mode, "current_mode", lambda: "code")

    def fake_turn_stream(sess_, fn, label=""):
        evs = []
        fn(evs.append)  # worker スレッド相当を同期で実行
        return evs

    monkeypatch.setattr(main, "_turn_stream", fake_turn_stream)


def test_chat_plan_first_goes_through_plan_phase(monkeypatch):
    sess = _FakePlanSess()
    _route(monkeypatch, sess)
    r = client.post("/api/chat",
                    json={"message": "認証を作って", "session_id": "s1", "plan_first": True})
    assert r.status_code == 200
    assert sess.phases == [True, False]
    assert "実行計画" in sess.messages[0]


def test_chat_normal_does_not_touch_plan_phase(monkeypatch):
    sess = _FakePlanSess()
    _route(monkeypatch, sess)
    r = client.post("/api/chat", json={"message": "認証を作って", "session_id": "s1"})
    assert r.status_code == 200
    assert sess.phases == []                      # 通常経路は制限しない
    assert sess.messages == ["認証を作って"]      # メッセージはそのまま（context 無し）
