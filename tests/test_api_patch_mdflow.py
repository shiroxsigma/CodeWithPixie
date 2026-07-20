"""/api/patch の mdflow 検証のテスト（NWP tests/test_api_patch_mdflow.py の移植）。

CWP 既存の /api/patch（search/replace 適用計算）に mdflow_warnings を統合したことを固定する。
mermaid/mdflow を含まないテキストでは警告が常に空（Code モードに無害）であることも確認。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app, base_url="http://127.0.0.1")

BASE = """\
# ログイン仕様

```mermaid
%% id: flow-login
flowchart TD
    A[開始] --> B{認証}
    B --> C[終了]
```

```mdflow-mapping
diagram: flow-login
presets:
  正常:
    when: 'ok == 1'
    active_nodes: [A, B, C]
```
"""


def _patch(base, search, replace):
    r = client.post("/api/patch", json={"base": base, "edits": [{"search": search, "replace": replace}]})
    assert r.status_code == 200
    return r.json()


def test_patch_valid_edit_no_warnings():
    r = _patch(BASE, "active_nodes: [A, B, C]", "active_nodes: [A, B]")
    assert r["applied"] == 1
    assert r["mdflow_warnings"] == []


def test_patch_invalid_node_warns():
    r = _patch(BASE, "active_nodes: [A, B, C]", "active_nodes: [A, B, ZZZ]")
    assert r["applied"] == 1
    assert any("ZZZ" in w for w in r["mdflow_warnings"])


def test_patch_broken_when_warns():
    r = _patch(BASE, "when: 'ok == 1'", "when: 'ok =='")
    assert any("構文エラー" in w for w in r["mdflow_warnings"])


def test_patch_preexisting_warning_not_reported():
    # 元から壊れている（ZZZ が無い）ノートへの無関係な編集では、既存の警告を出さない
    broken = BASE.replace("active_nodes: [A, B, C]", "active_nodes: [A, ZZZ]")
    r = _patch(broken, "# ログイン仕様", "# ログイン仕様（改訂）")
    assert r["applied"] == 1
    assert r["mdflow_warnings"] == []


def test_patch_plain_text_no_warnings():
    # Code モードの普通のソース編集で警告フィールドが邪魔をしないこと
    r = _patch("def f():\n    return 1\n", "return 1", "return 2")
    assert r["applied"] == 1
    assert r["mdflow_warnings"] == []
