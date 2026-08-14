"""静的ファイルのキャッシュ制御。

サーバが Cache-Control を返さないと、ブラウザは Last-Modified からの経過時間で
「推測の鮮度」を決めて再利用し、サーバへ問い合わせすらしない。その結果
app.js だけ新しく markdown.js は数世代前、という状態が実機で起きた
（図のバーに拡大縮小ボタンが増えない、という形で表面化した）。
index.html の ?v= 書き換えは直接参照される 2 ファイルにしか効かないので、
ES モジュールの import 先まで守るにはヘッダ側が要る。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

# verify_origin（DNS リバインディング対策）が testserver を弾くため、許可済みホストで叩く
client = TestClient(app, base_url="http://127.0.0.1")


def test_index_uses_versioned_cwp_favicon():
    response = client.get("/")
    assert response.status_code == 200
    assert '/static/favicon.svg?v=3' in response.text
    assert "🧚" not in response.text


def test_legacy_favicon_is_explicitly_cleared():
    response = client.get("/favicon.ico")
    assert response.status_code == 204
    assert response.headers["cache-control"] == "no-store, max-age=0"


def test_static_module_is_revalidated():
    """app.js から import されるだけのモジュールにも no-cache が付く。"""
    r = client.get("/static/js/markdown.js")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-cache"
    # no-store ではない: 変わっていなければ 304 で済ませたい
    assert r.headers.get("etag")


def test_static_not_modified_keeps_cache_control():
    """304 のときもヘッダが落ちない（落ちると次回また推測キャッシュに戻る）。"""
    first = client.get("/static/js/markdown.js")
    again = client.get("/static/js/markdown.js",
                       headers={"if-none-match": first.headers["etag"]})
    assert again.status_code == 304
    assert again.headers["cache-control"] == "no-cache"


def test_index_is_revalidated_and_versions_entry_points():
    """index.html 自身も握られない。掴まれると ?v= の書き換えごと古いままになる。"""
    r = client.get("/")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-cache"
    assert "/static/js/app.js?v=" in r.text
    assert "/static/css/style.css?v=" in r.text
