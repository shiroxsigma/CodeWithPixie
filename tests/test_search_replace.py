"""全文検索の前後行付与と一括置換のテスト。

契約:
  - ヒットに前後 CONTEXT_LINES 行が付く（ファイル先頭・末尾でも落ちない）
  - 大文字小文字の扱いは検索と置換で同じ（`case` フラグ）
  - 検索語は**リテラル**として置換される（正規表現として解釈しない）
  - dry_run では1バイトも書かない。実行時は旧内容がローカル履歴に残る
  - 対象は呼び出し側が渡した paths だけ（一覧に出ていないファイルを巻き込まない）
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, history, main, search  # noqa: E402
from app.config import settings  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    monkeypatch.setattr(settings, "history_enabled", True)
    return tmp_path.resolve()


# --- 前後行 -------------------------------------------------------------------

def test_hits_carry_context_lines(workspace):
    (workspace / "a.md").write_text(
        "l1\nl2\nl3\nTARGET\nl5\nl6\nl7\n", encoding="utf-8")
    hits = search.search("TARGET", case_sensitive=True)
    assert len(hits) == 1
    hit = hits[0]
    assert hit["path"] == "a.md" and hit["line"] == 4 and hit["text"] == "TARGET"
    assert hit["before"] == ["l2", "l3"]
    assert hit["after"] == ["l5", "l6"]


def test_context_at_file_edges(workspace):
    (workspace / "a.md").write_text("TARGET\nonly\n", encoding="utf-8")
    hit = search.search("TARGET", case_sensitive=True)[0]
    assert hit["before"] == [] and hit["after"] == ["only"]

    (workspace / "b.md").write_text("only\nTARGET", encoding="utf-8")
    hit = next(h for h in search.search("TARGET", case_sensitive=True) if h["path"] == "b.md")
    assert hit["before"] == ["only"] and hit["after"] == []


def test_case_sensitivity_flag(workspace):
    (workspace / "a.md").write_text("Widget\nwidget\n", encoding="utf-8")
    assert len(search.search("widget", case_sensitive=False)) == 2
    assert len(search.search("widget", case_sensitive=True)) == 1


def test_search_api_shape(workspace):
    (workspace / "a.md").write_text("x\nhello\ny\n", encoding="utf-8")
    r = client.get("/api/search", params={"q": "hello"}).json()
    assert r["case"] is False
    hit = r["results"][0]
    assert hit["before"] == ["x"] and hit["after"] == ["y"]


# --- 置換 ---------------------------------------------------------------------

def test_dry_run_writes_nothing(workspace):
    (workspace / "a.md").write_text("old old\n", encoding="utf-8")
    r = search.replace_in_files("old", "new", ["a.md"], dry_run=True)
    assert r["total"] == 2 and r["changed_files"] == 1 and r["dry_run"] is True
    assert r["files"][0]["samples"][0] == {"line": 1, "before": "old old", "after": "new new"}
    assert (workspace / "a.md").read_text(encoding="utf-8") == "old old\n"
    assert history.list_versions("a.md") == []  # 履歴も汚さない


def test_replace_writes_and_keeps_history(workspace):
    (workspace / "a.md").write_text("old\n", encoding="utf-8")
    r = search.replace_in_files("old", "new", ["a.md"], dry_run=False)
    assert r["total"] == 1
    assert (workspace / "a.md").read_text(encoding="utf-8") == "new\n"
    versions = history.list_versions("a.md")
    assert len(versions) == 1
    assert history.read_version("a.md", versions[0]["id"]) == "old\n"  # 置換前へ戻せる


def test_query_is_literal_not_regex(workspace):
    (workspace / "a.md").write_text("a.b axb\n", encoding="utf-8")
    search.replace_in_files("a.b", "Z", ["a.md"], case_sensitive=True, dry_run=False)
    # 正規表現なら "axb" も食われる。リテラルなので "a.b" だけが置き換わる
    assert (workspace / "a.md").read_text(encoding="utf-8") == "Z axb\n"


def test_replacement_backslashes_are_literal(workspace):
    """置換文字列に \\1 等が入っても後方参照として解釈されない（そのまま入る）。"""
    (workspace / "a.md").write_text("X\n", encoding="utf-8")
    search.replace_in_files("X", r"\1 \\ ok", ["a.md"], dry_run=False)
    assert (workspace / "a.md").read_text(encoding="utf-8") == r"\1 \\ ok" + "\n"


def test_case_insensitive_replace(workspace):
    (workspace / "a.md").write_text("Widget widget WIDGET\n", encoding="utf-8")
    search.replace_in_files("widget", "gizmo", ["a.md"], case_sensitive=False, dry_run=False)
    assert (workspace / "a.md").read_text(encoding="utf-8") == "gizmo gizmo gizmo\n"


def test_only_listed_paths_are_touched(workspace):
    (workspace / "a.md").write_text("old\n", encoding="utf-8")
    (workspace / "b.md").write_text("old\n", encoding="utf-8")
    search.replace_in_files("old", "new", ["a.md"], dry_run=False)
    assert (workspace / "b.md").read_text(encoding="utf-8") == "old\n"


def test_paths_outside_workspace_are_ignored(workspace):
    r = search.replace_in_files("x", "y", ["../outside.md"], dry_run=False)
    assert r["files"] == [] and r["total"] == 0


def test_non_matching_file_is_not_rewritten(workspace):
    p = workspace / "a.md"
    p.write_text("nothing here\n", encoding="utf-8")
    before = p.stat().st_mtime_ns
    r = search.replace_in_files("zzz", "y", ["a.md"], dry_run=False)
    assert r["changed_files"] == 0
    assert p.stat().st_mtime_ns == before  # 触ってすらいない


def test_empty_query_rejected(workspace):
    with pytest.raises(ValueError):
        search.replace_in_files("", "y", ["a.md"])
    assert client.post("/api/search/replace",
                       json={"query": "", "replace": "y", "paths": []}).status_code == 400


def test_replace_api_roundtrip(workspace):
    (workspace / "a.md").write_text("old old\n", encoding="utf-8")
    preview = client.post("/api/search/replace", json={
        "query": "old", "replace": "new", "paths": ["a.md"], "dry_run": True}).json()
    assert preview["total"] == 2
    assert (workspace / "a.md").read_text(encoding="utf-8") == "old old\n"

    done = client.post("/api/search/replace", json={
        "query": "old", "replace": "new", "paths": ["a.md"], "dry_run": False}).json()
    assert done["total"] == 2 and done["dry_run"] is False
    assert (workspace / "a.md").read_text(encoding="utf-8") == "new new\n"
