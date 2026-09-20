"""ターン単位スナップショット＆ロールバック（AgentSession.take_turn_snapshot /
rollback / POST /api/rollback）のテスト。
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


def make_sess():
    """AgentSession を __init__ なしで組み立てる（スナップショット周りのみに注目）。"""
    sess = engine_adapter.AgentSession.__new__(engine_adapter.AgentSession)
    sess._snapshots = {}
    sess._changesets_by_turn = {}
    sess.workspace = str(config.WORKSPACE)
    return sess


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    return tmp_path


def test_snapshot_and_rollback(workspace):
    (workspace / "a.py").write_text("v1\n", encoding="utf-8")
    (workspace / "sub").mkdir()
    (workspace / "sub" / "b.md").write_text("hello\n", encoding="utf-8")
    sess = make_sess()
    sess.take_turn_snapshot(1)

    # ターン中の「変更」と「削除」
    (workspace / "a.py").write_text("v2 CHANGED\n", encoding="utf-8")
    (workspace / "sub" / "b.md").unlink()

    restored = sess.rollback(1)
    assert sorted(restored) == ["a.py", "sub/b.md"]
    assert (workspace / "a.py").read_text(encoding="utf-8") == "v1\n"
    assert (workspace / "sub" / "b.md").read_text(encoding="utf-8") == "hello\n"  # 復活


def test_rollback_skips_unchanged(workspace):
    (workspace / "c.py").write_text("same\n", encoding="utf-8")
    sess = make_sess()
    sess.take_turn_snapshot(1)
    assert sess.rollback(1) == []  # 変わっていないファイルは戻し対象外


@pytest.mark.parametrize("switch_before_snapshot", [False, True])
def test_rollback_stays_in_session_workspace(workspace, monkeypatch, switch_before_snapshot):
    original = workspace / "original"
    other = workspace / "other"
    original.mkdir()
    other.mkdir()
    (original / "same.py").write_text("original before", encoding="utf-8")
    (other / "same.py").write_text("other untouched", encoding="utf-8")
    monkeypatch.setattr(config, "WORKSPACE", original)
    sess = make_sess()
    if switch_before_snapshot:
        monkeypatch.setattr(config, "WORKSPACE", other)
    sess.take_turn_snapshot(1)
    (original / "same.py").write_text("original after", encoding="utf-8")
    monkeypatch.setattr(config, "WORKSPACE", other)

    assert sess.rollback(1) == ["same.py"]
    assert (original / "same.py").read_text(encoding="utf-8") == "original before"
    assert (other / "same.py").read_text(encoding="utf-8") == "other untouched"
    assert config.WORKSPACE == other


def test_rollback_rejects_paths_outside_session_workspace(workspace):
    original = workspace / "original"
    original.mkdir()
    outside = workspace / "outside.py"
    outside.write_text("untouched", encoding="utf-8")
    sess = make_sess()
    sess.workspace = str(original)
    sess._snapshots[1] = {"../outside.py": b"must not be written"}

    assert sess.rollback(1) == []
    assert outside.read_text(encoding="utf-8") == "untouched"


def test_rollback_unknown_turn(workspace):
    sess = make_sess()
    assert sess.rollback(99) is None


def test_changeset_rollback_removes_created_files_without_snapshot(workspace):
    created = workspace / "created.py"
    created.write_text("new", encoding="utf-8")
    sess = make_sess()

    class Engine:
        def revert_changeset(self, change_id):
            assert change_id == "chg_1"
            created.unlink()
            return {"reverted": True, "restored": ["created.py"]}

    sess._engine = Engine()
    sess._changesets_by_turn[4] = ["chg_1"]

    assert sess.rollback(4) == ["created.py"]
    assert not created.exists()


def test_snapshot_retention(workspace):
    (workspace / "f.txt").write_text("x", encoding="utf-8")
    sess = make_sess()
    for t in range(1, 13):  # 12 ターンぶん撮る
        sess.take_turn_snapshot(t)
    assert len(sess._snapshots) == engine_adapter.ROLLBACK_KEEP_TURNS
    # 最古の ROLLBACK_KEEP_TURNS 件が残る（3..12）
    assert min(sess._snapshots) == 13 - engine_adapter.ROLLBACK_KEEP_TURNS


def test_snapshot_skips_large_and_hidden(workspace, monkeypatch):
    monkeypatch.setattr(engine_adapter, "_ROLLBACK_MAX_FILE_BYTES", 10)
    (workspace / "small.py").write_text("x", encoding="utf-8")
    (workspace / "big.py").write_text("y" * 100, encoding="utf-8")
    (workspace / ".pixie_notes").mkdir()
    (workspace / ".pixie_notes" / "s.json").write_text("z", encoding="utf-8")
    sess = make_sess()
    sess.take_turn_snapshot(1)
    assert set(sess._snapshots[1]) == {"small.py"}  # 巨大ファイル・隠しdir は対象外


# --- /api/rollback ---

def test_api_rollback_endpoint(workspace, monkeypatch):
    (workspace / "t.py").write_text("before\n", encoding="utf-8")
    sess = make_sess()
    sess.take_turn_snapshot(3)
    (workspace / "t.py").write_text("after\n", encoding="utf-8")

    class Mgr:
        def get(self, sid):
            return sess

    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    r = client.post("/api/rollback", json={"session_id": "s1", "turn_id": 3})
    assert r.json() == {"ok": True, "restored": ["t.py"]}
    assert (workspace / "t.py").read_text(encoding="utf-8") == "before\n"


def test_api_rollback_no_snapshot(monkeypatch):
    sess = make_sess()

    class Mgr:
        def get(self, sid):
            return sess

    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    r = client.post("/api/rollback", json={"session_id": "s1", "turn_id": 1})
    assert r.json()["ok"] is False


def test_api_rollback_unknown_session(monkeypatch):
    class Mgr:
        def get(self, sid):
            return None

    monkeypatch.setattr(main, "_require_manager", lambda: Mgr())
    assert client.post("/api/rollback",
                       json={"session_id": "s1", "turn_id": 1}).status_code == 404
