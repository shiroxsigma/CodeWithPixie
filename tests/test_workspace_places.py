"""作業フォルダの「行き先」（⭐お気に入り / 🕘最近使った）のテスト。

契約:
  - お気に入りは config.json（アプリ設定）に持つ。ワークスペースを移しても残る
  - 同じパスは1件（Windows は大文字小文字を畳む）。上限を超えたら足せない
  - 最近使ったは切替のたびに自動で先頭へ。現在地は一覧に出さない
  - 消えたフォルダも一覧からは消さず exists=False で伝える（誤って掃除しない）
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, engine_adapter, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def cfg(tmp_path, monkeypatch):
    """config.json をテンポラリに差し替え、WORKSPACE も隔離する。"""
    monkeypatch.setattr(config, "CONFIG_JSON", tmp_path / "config.json")
    ws = tmp_path / "ws0"
    ws.mkdir()
    monkeypatch.setattr(config, "WORKSPACE", ws.resolve())
    # 切替のたびに Note セッションを作り直す副作用はここでは不要
    monkeypatch.setattr(engine_adapter, "reset_note_session", lambda: None)
    return tmp_path


# --- お気に入り ---------------------------------------------------------------

def test_add_and_list_favorite(cfg):
    d = cfg / "projects" / "myapp"
    d.mkdir(parents=True)
    config.add_favorite(str(d))
    favs = config.list_favorites()
    assert len(favs) == 1
    assert favs[0]["path"] == str(d.resolve())
    assert favs[0]["name"] == "myapp"  # 既定は末尾フォルダ名
    assert favs[0]["exists"] is True


def test_add_is_idempotent_and_updates_name(cfg):
    d = cfg / "a"
    d.mkdir()
    config.add_favorite(str(d))
    config.add_favorite(str(d), "仕様書おきば")
    favs = config.list_favorites()
    assert len(favs) == 1 and favs[0]["name"] == "仕様書おきば"


def test_dedupe_is_case_insensitive_on_windows(cfg):
    d = cfg / "Docs"
    d.mkdir()
    config.add_favorite(str(d))
    config.add_favorite(str(d).upper() if sys.platform == "win32" else str(d))
    assert len(config.list_favorites()) == 1


def test_remove_favorite(cfg):
    d = cfg / "a"
    d.mkdir()
    config.add_favorite(str(d))
    config.remove_favorite(str(d))
    assert config.list_favorites() == []


def test_favorite_rejects_file_and_blank(cfg):
    f = cfg / "a.txt"
    f.write_text("x", encoding="utf-8")
    with pytest.raises(ValueError):
        config.add_favorite(str(f))
    with pytest.raises(ValueError):
        config.add_favorite("   ")


def test_favorites_cap(cfg, monkeypatch):
    monkeypatch.setattr(config, "FAVORITES_MAX", 2)
    for n in ("a", "b"):
        (cfg / n).mkdir()
        config.add_favorite(str(cfg / n))
    (cfg / "c").mkdir()
    with pytest.raises(ValueError):
        config.add_favorite(str(cfg / "c"))


def test_missing_folder_is_kept_but_flagged(cfg):
    gone = cfg / "gone"
    gone.mkdir()
    config.add_favorite(str(gone))
    gone.rmdir()
    favs = config.list_favorites()
    assert len(favs) == 1 and favs[0]["exists"] is False


def test_favorites_tolerate_hand_written_config(cfg):
    """config.json を手で書く人向け: 文字列だけ・壊れた要素が混ざっても落ちない。"""
    config._write_config_json({"favorites": [str(cfg), {"bad": 1}, 42, {"path": str(cfg / "x")}]})
    favs = config.list_favorites()
    assert [f["path"] for f in favs] == [str(cfg), str(cfg / "x")]


# --- 最近使った ---------------------------------------------------------------

def test_recent_records_the_folder_we_left(cfg):
    old = config.WORKSPACE
    (cfg / "ws1").mkdir()
    config.set_workspace(str(cfg / "ws1"))
    recent = config.list_recent()
    assert [r["path"] for r in recent] == [str(old)]


def test_recent_is_most_recent_first_without_duplicates(cfg):
    for n in ("ws1", "ws2"):
        (cfg / n).mkdir()
    start = config.WORKSPACE
    config.set_workspace(str(cfg / "ws1"))   # 離れたのは ws0
    config.set_workspace(str(cfg / "ws2"))   # 離れたのは ws1
    config.set_workspace(str(start))         # 離れたのは ws2
    assert [r["path"] for r in config.list_recent()] == [
        str(cfg / "ws2"), str(cfg / "ws1")]  # 現在地(ws0)は出さない


def test_recent_cap(cfg, monkeypatch):
    monkeypatch.setattr(config, "RECENT_MAX", 2)
    for i in range(4):
        (cfg / f"w{i}").mkdir()
        config.set_workspace(str(cfg / f"w{i}"))
    assert len(config.list_recent()) <= 2


def test_favorites_survive_workspace_switch(cfg):
    d = cfg / "keepme"
    d.mkdir()
    config.add_favorite(str(d))
    (cfg / "elsewhere").mkdir()
    config.set_workspace(str(cfg / "elsewhere"))
    assert [f["path"] for f in config.list_favorites()] == [str(d.resolve())]


# --- API ----------------------------------------------------------------------

def test_places_api_roundtrip(cfg):
    d = cfg / "fav"
    d.mkdir()
    r = client.post("/api/workspace/favorites", json={"path": str(d), "name": "お気に"}).json()
    assert [f["name"] for f in r["favorites"]] == ["お気に"]
    assert r["current"] == str(config.WORKSPACE)

    (cfg / "ws1").mkdir()
    client.post("/api/workspace", json={"path": str(cfg / "ws1")})
    places = client.get("/api/workspace/places").json()
    assert [f["path"] for f in places["favorites"]] == [str(d.resolve())]
    assert [x["path"] for x in places["recent"]] == [str((cfg / "ws0").resolve())]

    left = client.request("DELETE", "/api/workspace/favorites",
                          params={"path": str(d)}).json()
    assert left["favorites"] == []


def test_places_api_rejects_file(cfg):
    f = cfg / "a.txt"
    f.write_text("x", encoding="utf-8")
    r = client.post("/api/workspace/favorites", json={"path": str(f)})
    assert r.status_code == 400
