"""Plan モード（承認付きの事前計画）のテスト。

検証したいのは3点:
1. /api/mode が "plan" を受け付け、features が「承認なし・編集ブロックなし・単一セッション・
   書き込み不可」を返すこと（不正値は 400 のまま）。
2. Plan セッションが**書き込みツールを一切提示しない**こと。ここが「承認するまでファイルは
   1字も変えない」という仕様の土台なので、pixie_core.DESTRUCTIVE_TOOLS との積が空である
   ことまで見る。
3. mode=="plan" のチャット経路が _turn_stream の契約（token/status → 最後に done）で流れること。

TestClient は startup を走らせないので AWP bootstrap も LLM 接続も不要（エンジンは
monkeypatch でダミーに差し替える）。
"""
import json
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, engine_adapter, main, mode  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")

_AWP_SRC = config.AWP_SRC
needs_awp = pytest.mark.skipif(
    not (_AWP_SRC / "pixie_core" / "_api.py").exists(),
    reason=f"AnythingWithPixie が見つからない: {_AWP_SRC}",
)


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    """config.WORKSPACE を一時フォルダへ差し替える（サイドカーを実 workspace に書かない）。"""
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    return tmp_path


# --- /api/mode ------------------------------------------------------------------

def test_mode_accepts_plan_and_persists(workspace):
    r = client.post("/api/mode", json={"mode": "plan"})
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "plan"
    assert "plan" in body["modes"]

    f = body["features"]
    assert f["approval"] is False      # 承認バーは出さない（承認するのは計画そのもの）
    assert f["edit_blocks"] is False   # search/replace のクリック反映は Note の機能
    assert f["mdflow"] is False
    assert f["plan_view"] is True      # 左ペインの計画ビュー
    assert f["writes"] is False        # エージェントはファイルを変更しない
    assert f["sessions"] == "single"

    sidecar = workspace / mode.SIDECAR_NAME
    assert json.loads(sidecar.read_text(encoding="utf-8"))["last_mode"] == "plan"
    assert client.get("/api/mode").json()["mode"] == "plan"


def test_mode_features_of_other_modes_unaffected(workspace):
    """plan_view / writes は Code/Note でも正しい値であること（新フラグの取り違え防止）。"""
    code = client.post("/api/mode", json={"mode": "code"}).json()["features"]
    assert code["plan_view"] is False and code["writes"] is True and code["sessions"] == "multi"
    note = client.post("/api/mode", json={"mode": "note"}).json()["features"]
    assert note["plan_view"] is False and note["writes"] is False and note["sessions"] == "single"


def test_mode_still_rejects_unknown(workspace):
    assert client.post("/api/mode", json={"mode": "planning"}).status_code == 400
    assert client.post("/api/mode", json={"mode": ""}).status_code == 400


# --- Plan セッションのツール集合（読み取り専用の担保）-----------------------------

#: Plan モードに絶対に出てはいけないツール（出たらファイルが勝手に変わりうる）。
_FORBIDDEN = ("write_file", "append_to_file", "write_sections", "search_and_replace",
              "replace_lines", "delete_file", "move_file", "run_command", "run_python",
              "make_directory", "kill_process")


def test_plan_tools_exclude_write_tools():
    for name in _FORBIDDEN:
        assert name not in engine_adapter.PLAN_TOOLS, f"{name} が Plan モードに提示されている"


def test_plan_session_allowed_set_is_read_only():
    """copilot on/off どちらでも許可集合に書き込みツールが混ざらないこと。"""
    for copilot in (True, False):
        allowed = engine_adapter.PlanSession._allowed_set(copilot)
        assert engine_adapter.PLAN_TOOLS <= allowed
        assert not allowed.intersection(_FORBIDDEN)
        assert ("ask_copilot" in allowed) is copilot


def test_plan_system_suffix_asks_for_fenced_numbered_plan():
    """フロントは ```plan フェンスで計画を取り出す。指示が消えると承認 UI が出なくなる。"""
    sfx = engine_adapter.PLAN_SYSTEM_SUFFIX
    assert "```plan" in sfx
    assert "番号付き" in sfx
    assert "計画モード" in sfx


@needs_awp
def test_plan_tools_are_subset_of_core_readonly():
    """PLAN_TOOLS が pixie_core の読み取り専用集合に収まり、破壊的集合と交わらないこと。

    PLAN_TOOLS はリテラルで持っているので、AWP 側の分類が変わったらここで気づけるようにする。"""
    core = engine_adapter.bootstrap(_AWP_SRC)
    assert engine_adapter.PLAN_TOOLS <= set(core.READONLY_TOOLS)
    assert not engine_adapter.PLAN_TOOLS.intersection(core.DESTRUCTIVE_TOOLS)


@needs_awp
def test_plan_session_engine_profile(tmp_path):
    """エンジンに固定ツールプロファイルとして渡っていること（提示の実体）。"""
    engine_adapter.bootstrap(_AWP_SRC)
    session = engine_adapter.PlanSession(
        engine_adapter._core,
        {"base_url": "http://localhost:1/v1", "model": "test"},
        str(tmp_path), copilot_enabled=False,
    )
    ctx = session._engine.context
    assert ctx.fixed_tool_set == engine_adapter.PLAN_TOOLS
    assert not ctx.fixed_tool_set.intersection(engine_adapter._core.DESTRUCTIVE_TOOLS)


# --- チャット経路（_turn_stream の契約）------------------------------------------

class _FakePlanSession:
    """run_turn だけを持つダミー。エンジンは起動しない。"""

    def __init__(self):
        self.busy = threading.Lock()
        self.messages = []

    def set_copilot(self, enabled):
        pass

    def run_turn(self, user_text, emit):
        self.messages.append(user_text)
        emit({"type": "status", "text": "🔍 read_file(app/mode.py)"})
        emit({"type": "token", "text": "```plan\n1. mode.py に plan を足す\n```"})

    def cancel(self):
        pass


@pytest.fixture()
def plan_sess(monkeypatch):
    s = _FakePlanSession()
    monkeypatch.setattr(main, "_manager", object())  # _require_manager を通すだけのダミー
    monkeypatch.setattr(main.mode, "current_mode", lambda: "plan")
    monkeypatch.setattr(main.engine_adapter, "get_plan_session", lambda: s)
    return s


def _events(body):
    out = []
    with client.stream("POST", "/api/chat", json=body) as r:
        assert r.status_code == 200
        for line in r.iter_lines():
            line = line.strip()
            if line.startswith("data:"):
                out.append(json.loads(line[5:].strip()))
    return out


def test_plan_chat_streams_turn_contract(plan_sess):
    evs = _events({"message": "ダークモードを足したい", "session_id": "s1"})
    assert [e["type"] for e in evs] == ["status", "token", "done"]
    assert "```plan" in evs[1]["text"]
    assert plan_sess.busy.acquire(blocking=False)  # ターン後に必ず解放されている


def test_plan_chat_passes_editor_context(plan_sess):
    _events({"message": "この関数を整理したい", "session_id": "s1",
             "selection": "def foo():\n    pass",
             "current_file": "src/a.py", "current_content": "def foo():\n    pass\n"})
    sent = plan_sess.messages[0]
    assert "src/a.py" in sent
    assert "def foo():" in sent
    assert sent.endswith("この関数を整理したい")  # 本題は末尾（前置きに埋もれさせない）


def test_plan_chat_is_busy_serialized(plan_sess):
    plan_sess.busy.acquire()  # 実行中を模す
    r = client.post("/api/chat", json={"message": "x", "session_id": "s1"})
    assert r.status_code == 409
