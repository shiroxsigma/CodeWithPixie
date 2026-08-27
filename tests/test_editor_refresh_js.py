"""LLM によるファイル変更がエディタへ確実に反映されることの回帰テスト。"""
from pathlib import Path


APP_JS = (Path(__file__).resolve().parents[1] / "static" / "js" / "app.js").read_text(
    encoding="utf-8"
)


def test_stream_waits_for_event_side_effects():
    assert "await handleEvent(ev);" in APP_JS


def test_files_changed_waits_for_editor_reload():
    assert "async function handleEvent(ev)" in APP_JS
    assert "await onFilesChanged(ev.paths || []);" in APP_JS
