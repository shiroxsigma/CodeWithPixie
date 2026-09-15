"""Mermaid PNGコピーの背景選択に関する回帰テスト。"""
from pathlib import Path


MARKDOWN_JS = (
    Path(__file__).resolve().parents[1] / "frontend" / "src" / "legacy" / "markdown.js"
).read_text(encoding="utf-8")


def test_mermaid_toolbar_has_white_background_copy():
    assert 'copyWhite.textContent = "白でコピー"' in MARKDOWN_JS
    assert 'png(pngBackground("white"))' in MARKDOWN_JS
    assert 'copyPngToClipboard(await png(pngBackground("white")))' in MARKDOWN_JS


def test_mermaid_white_copy_has_fixed_white_background():
    assert 'export function pngBackground(mode = "theme")' in MARKDOWN_JS
    assert 'if (mode === "white") return "#ffffff";' in MARKDOWN_JS
