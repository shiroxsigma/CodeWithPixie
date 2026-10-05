"""Workspace source export and Copilot attachment integration, without Copilot I/O."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import config, copilot, main  # noqa: E402

client = TestClient(main.app, base_url="http://127.0.0.1")


@pytest.fixture()
def workspace(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORKSPACE", tmp_path.resolve())
    (tmp_path / "src" / "nested").mkdir(parents=True)
    (tmp_path / "src" / "entry.py").write_text("DISK_ENTRY = 17\n", encoding="utf-8")
    (tmp_path / "src" / "nested" / "view.ts").write_text(
        "export const greeting = 'こんにちは';\n", encoding="utf-8")
    return tmp_path


def _workspace_files(workspace):
    return {p.relative_to(workspace).as_posix(): p.read_bytes()
            for p in workspace.rglob("*") if p.is_file()}


def _events(response):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/event-stream")
    return [json.loads(line[len("data:"):].strip())
            for line in response.text.splitlines() if line.startswith("data:")]


def _chat(bundle, message="/copilot_simple Fix the greeting", **extra):
    return client.post("/api/chat", json={
        "session_id": "source-bundle-tests", "message": message,
        "source_bundle": bundle, **extra,
    })


def test_api_exports_actual_workspace_sources_without_creating_files(workspace):
    before = _workspace_files(workspace)

    response = client.post("/api/workspace/source-bundle", json={})

    assert response.status_code == 200, response.text
    bundle = response.json()
    assert bundle["filename"].endswith(".md")
    assert Path(bundle["filename"]).name == bundle["filename"]
    assert "src/entry.py" in bundle["content"]
    assert before["src/entry.py"].decode("utf-8") in bundle["content"]
    assert "src/nested/view.ts" in bundle["content"]
    assert before["src/nested/view.ts"].decode("utf-8") in bundle["content"]
    assert _workspace_files(workspace) == before


@pytest.mark.parametrize("buffer", ["UNSAVED_ENTRY = '編集中'\n", ""])
def test_api_exports_unsaved_editor_buffer_without_saving(workspace, buffer):
    before = _workspace_files(workspace)

    response = client.post("/api/workspace/source-bundle", json={
        "current_file": "src/entry.py", "current_content": buffer,
    })

    assert response.status_code == 200, response.text
    content = response.json()["content"]
    assert "src/entry.py" in content
    assert "DISK_ENTRY = 17" not in content
    if buffer:
        assert buffer in content
    assert "export const greeting" in content
    assert _workspace_files(workspace) == before


def test_api_rejects_editor_buffer_outside_workspace(workspace):
    before = _workspace_files(workspace)

    response = client.post("/api/workspace/source-bundle", json={
        "current_file": "../outside.py", "current_content": "OUTSIDE_SECRET = True\n",
    })

    assert response.status_code == 400
    assert "OUTSIDE_SECRET" not in response.text
    assert _workspace_files(workspace) == before


@pytest.mark.parametrize("command", ["/copilot_simple", "/copilot!"])
def test_direct_copilot_attaches_complete_bundle_and_forwards_progress(
        workspace, monkeypatch, command):
    monkeypatch.setattr(config.settings, "copilot_enabled", True)
    # The source must survive the existing 15,000-character question limit.
    content = "# Project sources\r\n\r\n" + "SOURCE_ONLY_編集中\r\n" * 2_000 + "FINAL_SOURCE_MARKER\r\n"
    assert len(content) > main.COPILOT_QUESTION_MAX_CHARS
    bundle = {"filename": "project-sources.md", "content": content}
    before = _workspace_files(workspace)
    seen = {}
    additional_attachment = str(workspace / "reference.txt")

    def fake_ask(question, files=None, on_progress=None):
        seen["question"] = question
        seen["path"] = Path(files[0])
        assert seen["path"].is_file()
        assert seen["path"].name == bundle["filename"]
        assert not seen["path"].is_relative_to(workspace)
        assert seen["path"].read_bytes() == content.encode("utf-8")
        assert files[1:] == [additional_attachment]
        assert on_progress is not None
        on_progress("Uploading complete source bundle")
        return "Change the greeting and run its tests."

    monkeypatch.setattr(copilot, "ask", fake_ask)
    evs = _events(_chat(bundle, message=f"{command} Fix the greeting",
                        attach_files=[additional_attachment]))

    assert "Fix the greeting" in seen["question"]
    assert bundle["filename"] in seen["question"]
    assert "SOURCE_ONLY" not in seen["question"]
    assert "FINAL_SOURCE_MARKER" not in seen["question"]
    assert len(seen["question"]) < main.COPILOT_QUESTION_MAX_CHARS
    assert any(e["type"] == "status" and e["text"] == "Uploading complete source bundle"
               for e in evs)
    assert any(e["type"] == "token" and e["text"] == "Change the greeting and run its tests."
               for e in evs)
    assert evs[-1]["type"] == "done"
    assert not any(e["type"] == "error" for e in evs)
    assert not seen["path"].exists()
    assert not seen["path"].parent.exists()
    assert _workspace_files(workspace) == before


@pytest.mark.parametrize("failure", ["returned_error", "exception"])
def test_direct_copilot_removes_temporary_bundle_after_failure(
        workspace, monkeypatch, failure):
    monkeypatch.setattr(config.settings, "copilot_enabled", True)
    bundle = {"filename": "project-sources.md", "content": "# Sources\r\n" + "full-source\r\n" * 2_000}
    before = _workspace_files(workspace)
    seen = {}

    def fake_ask(question, files=None):
        seen["path"] = Path(files[0])
        assert seen["path"].read_bytes() == bundle["content"].encode("utf-8")
        if failure == "exception":
            raise RuntimeError("upload failed")
        return "エラー: upload failed"

    monkeypatch.setattr(copilot, "ask", fake_ask)
    evs = _events(_chat(bundle))

    assert any(e["type"] == "error" and "upload failed" in e["text"] for e in evs)
    assert evs[-1]["type"] == "done"
    assert not seen["path"].exists()
    assert not seen["path"].parent.exists()
    assert _workspace_files(workspace) == before


@pytest.mark.parametrize("filename", [
    "../project.md", "..\\project.md", "/absolute.md", "C:\\outside.md",
    "nested/project.md", "source.txt", "bundle.md\x00",
])
def test_chat_rejects_unsafe_bundle_filename_before_copilot(monkeypatch, filename):
    monkeypatch.setattr(copilot, "ask", lambda *a, **kw: pytest.fail("Copilot was called"))

    response = _chat({"filename": filename, "content": "# Sources\n"})

    assert response.status_code == 422


@pytest.mark.parametrize("message", ["Fix the greeting", "/copilot Fix the greeting"])
def test_source_bundle_requires_direct_copilot_command(monkeypatch, message):
    monkeypatch.setattr(copilot, "ask", lambda *a, **kw: pytest.fail("Copilot was called"))

    response = _chat({"filename": "project.md", "content": "# Sources\n"}, message=message)

    assert response.status_code == 400
    assert "/copilot_simple" in response.json()["detail"]


def test_disabled_copilot_never_creates_or_sends_bundle(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "copilot_enabled", False)
    monkeypatch.setattr(copilot, "ask", lambda *a, **kw: pytest.fail("Copilot was called"))
    monkeypatch.setattr(copilot, "ask_bundle_with_progress",
                        lambda *a, **kw: pytest.fail("Bundle attachment was created"))
    before = _workspace_files(workspace)

    evs = _events(_chat({"filename": "project.md", "content": "# Sources\n"}))

    assert [e["type"] for e in evs] == ["error", "done"]
    assert "無効" in evs[0]["text"]
    assert _workspace_files(workspace) == before
