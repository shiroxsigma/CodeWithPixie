"""note_tools.execute_sync（pixie_core worker スレッド用の同期コア）のテスト。

エラーは例外でなく「エラー: …」文字列で返す契約（LLM に自己修正させる）を固定する。
NWP tests/test_tools_sync.py の移植（Stage C）。LLM / PrayLight 接続が要るもの
（ask_copilot 実行）は対象外。
"""
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import config, note_tools  # noqa: E402


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    """config.WORKSPACE を一時フォルダへ差し替える（実 workspace を汚さない）。"""
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    (tmp_path / "note.md").write_text("# タイトル\n本文です\n", encoding="utf-8")
    return tmp_path


def test_list_workspace(workspace):
    out = note_tools.execute_sync("list_workspace", {})
    assert "note.md" in out


def test_read_note(workspace):
    out = note_tools.execute_sync("read_note", {"path": "note.md"})
    assert "本文です" in out


def test_read_note_missing_is_error_string(workspace):
    out = note_tools.execute_sync("read_note", {"path": "nai.md"})
    assert out.startswith("エラー: ファイルが見つかりません")


def test_read_note_binary_ext_rejected(workspace):
    (workspace / "pic.png").write_bytes(b"\x89PNG....")
    out = note_tools.execute_sync("read_note", {"path": "pic.png"})
    assert out.startswith("エラー:") and ".png" in out


def test_read_note_escape_rejected(workspace):
    out = note_tools.execute_sync("read_note", {"path": "../../etc/hosts"})
    assert out.startswith("エラー:")


def test_missing_required_arg(workspace):
    out = note_tools.execute_sync("read_note", {})
    assert out.startswith("エラー: 必須引数")


def test_unknown_tool(workspace):
    out = note_tools.execute_sync("write_file", {"path": "x", "content": "y"})
    assert out.startswith("エラー: 不明なツール")


@pytest.mark.skipif(shutil.which("rg") is None, reason="ripgrep 不在")
def test_grep_workspace(workspace):
    out = note_tools.execute_sync("grep_workspace", {"query": "本文"})
    assert "note.md" in out


def test_describe_flows(workspace):
    (workspace / "flow.md").write_text(
        "```mermaid\n%% id: f1\nflowchart TD\n    A --> B\n```\n", encoding="utf-8")
    out = note_tools.execute_sync("describe_flows", {"path": "flow.md"})
    assert "f1" in out


def test_ask_copilot_disabled_is_error_string(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "copilot_enabled", False)
    out = note_tools.execute_sync("ask_copilot", {"question": "hi"})
    assert out.startswith("エラー:")
