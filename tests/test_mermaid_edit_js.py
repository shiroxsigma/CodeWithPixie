"""tests/test_mermaid_edit.mjs（JS 側のフローチャート編集ロジック）を pytest から回す。

node が入っていない環境では skip する。JS のためだけに npm を持ち込まない代わりに、
テストランナーはこの1本で pytest に寄せている。
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

SCRIPT = Path(__file__).with_name("test_mermaid_edit.mjs")


@pytest.mark.skipif(shutil.which("node") is None, reason="node が無い環境ではスキップ")
def test_mermaid_edit_pure_functions() -> None:
    r = subprocess.run(
        [shutil.which("node"), str(SCRIPT)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=SCRIPT.parent.parent,
    )
    assert r.returncode == 0, f"JS テストが失敗しました:\n{r.stdout}\n{r.stderr}"
