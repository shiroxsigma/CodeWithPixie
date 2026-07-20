"""POST /api/image（画像の保存）のテスト。

貼り付け画像（既定・上書きしない）と mermaid 図の書き出し（overwrite=True・同じ名前へ
書き直す）の2つの使われ方があるので、両方の契約を押さえる。ワークスペースの外へ
書けないこと（note を省略したときを含む）も見る。
"""
import base64
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app, base_url="http://127.0.0.1")

#: 1x1 PNG（内容は問わないが、実データであることに意味がある）。
PNG_B64 = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmM"
           "IQAAAABJRU5ErkJggg==")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    return tmp_path


def save(**kw):
    body = {"note": "note.md", "data_b64": PNG_B64, "ext": "png"}
    body.update(kw)
    return client.post("/api/image", json=body)


def test_saves_next_to_the_note(workspace):
    r = save(name="fig")
    assert r.status_code == 200
    body = r.json()
    assert body["path"] == "images/fig.png"
    assert body["rel"] == "images/fig.png"   # ノートから貼る側の相対パス
    assert (workspace / "images" / "fig.png").read_bytes() == base64.b64decode(PNG_B64)


def test_subdirectory_note_keeps_images_beside_it(workspace):
    (workspace / "docs").mkdir()
    r = save(note="docs/note.md", name="fig")
    assert r.json()["path"] == "docs/images/fig.png"
    assert r.json()["rel"] == "images/fig.png"


def test_paste_does_not_overwrite(workspace):
    """貼り付け画像は既存を絶対に消さない（別ノートの画像を巻き添えにしない）。"""
    assert save(name="fig").json()["path"] == "images/fig.png"
    assert save(name="fig").json()["path"] == "images/fig-2.png"
    assert save(name="fig").json()["path"] == "images/fig-3.png"


def test_overwrite_reuses_the_same_file(workspace):
    """mermaid 図の書き出しは同じ名前へ書き直す（図1枚につきファイル1個に保つ）。"""
    assert save(name="note-flow", overwrite=True).json()["path"] == "images/note-flow.png"
    assert save(name="note-flow", overwrite=True).json()["path"] == "images/note-flow.png"
    assert len(list((workspace / "images").iterdir())) == 1


def test_without_note_saves_at_workspace_root(workspace):
    """ファイルを開いていない状態からも書き出せる。root の .parent へ出ないこと。"""
    r = save(note="", name="fig", overwrite=True)
    assert r.status_code == 200
    assert r.json()["path"] == "images/fig.png"
    assert (workspace / "images" / "fig.png").is_file()


def test_rejects_path_escape(workspace):
    assert save(note="../outside.md", name="fig").status_code == 400


def test_rejects_non_image_extension(workspace):
    r = save(name="payload", ext="bat")
    assert r.status_code == 400
    assert "対応していない" in r.json()["detail"]


def test_rejects_broken_base64(workspace):
    assert save(name="fig", data_b64="not-base64!!").status_code == 400


def test_rejects_empty_data(workspace):
    assert save(name="fig", data_b64="").status_code == 400
