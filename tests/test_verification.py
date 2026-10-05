import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app import config, main, verification


def test_python_project_and_api(tmp_path, monkeypatch):
    (tmp_path / "pytest.ini").write_text("", encoding="utf-8")
    monkeypatch.setattr(config, "WORKSPACE", tmp_path)
    response = TestClient(main.app, base_url="http://127.0.0.1").get(
        "/api/workspace/verification-command")
    assert response.status_code == 200
    assert response.json() == {"command": "python -m pytest -q"}


def test_javascript_and_nested_frontend(tmp_path):
    frontend = tmp_path / "frontend"
    frontend.mkdir()
    package = {"scripts": {"test": "vitest run"}}
    (frontend / "package.json").write_text(json.dumps(package), encoding="utf-8")
    assert verification.suggest_command(tmp_path) == "npm --prefix frontend test"
    (tmp_path / "package.json").write_text(json.dumps(package), encoding="utf-8")
    assert verification.suggest_command(tmp_path) == "npm test"


def test_missing_broken_and_placeholder_configs(tmp_path):
    assert verification.suggest_command(tmp_path) == ""
    package = tmp_path / "package.json"
    for content in ('invalid', '[]', '{"scripts": null}',
                    json.dumps({"scripts": {"test": 'echo "Error: no test specified" && exit 1'}})):
        package.write_text(content, encoding="utf-8")
        assert verification.suggest_command(tmp_path) == ""
