"""Suggest an existing project test command without executing it."""
import json
from pathlib import Path


def suggest_command(workspace) -> str:
    root = Path(workspace).resolve()

    def read(relative):
        path = root / relative
        try:
            path.resolve().relative_to(root)
            if path.stat().st_size > 256_000:
                return ""
            return path.read_text(encoding="utf-8")
        except (OSError, ValueError, UnicodeError):
            return ""

    def npm_test(relative, prefix=""):
        try:
            package = json.loads(read(relative))
            script = package.get("scripts", {}).get("test", "")
            if isinstance(script, str) and script.strip() and "no test specified" not in script:
                return f"npm {prefix}test"
        except (ValueError, AttributeError, TypeError):
            pass
        return ""

    command = npm_test("package.json")
    if command:
        return command
    if (root / "pytest.ini").is_file() or ("pytest" in read("pyproject.toml")
            or "pytest" in read("requirements.txt") or read("conftest.py")):
        return "python -m pytest -q"
    return npm_test("frontend/package.json", "--prefix frontend ")
