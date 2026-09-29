"""Distribution and developer checkout selection must be deterministic."""
from pathlib import Path
from types import SimpleNamespace

import pytest

from app import core_loader


def package(root):
    folder = root / "pixie_core"
    folder.mkdir(parents=True)
    (folder / "__init__.py").write_text('API_VERSION = "1.12"\n', encoding="utf-8")
    return root.resolve()


def test_installed_engine_wins_over_sibling_checkout(tmp_path, monkeypatch):
    installed = package(tmp_path / "installed")
    sibling = package(tmp_path / "AnythingWithPixie" / "src")
    monkeypatch.setattr(core_loader, "__file__", str(tmp_path / "CWP" / "app" / "core_loader.py"))
    monkeypatch.setattr(core_loader.importlib.util, "find_spec", lambda _: SimpleNamespace(
        origin=str(installed / "pixie_core" / "__init__.py")))
    assert core_loader.core_source() == installed
    assert core_loader.core_source(sibling) == sibling


def test_missing_explicit_checkout_is_an_error_not_a_silent_fallback(tmp_path):
    with pytest.raises(RuntimeError, match="awp_src"):
        core_loader.core_source(tmp_path / "typo")


def test_uninstalled_engine_uses_developer_checkout(tmp_path, monkeypatch):
    sibling = package(tmp_path / "AnythingWithPixie" / "src")
    monkeypatch.setattr(core_loader, "__file__", str(tmp_path / "CWP" / "app" / "core_loader.py"))
    monkeypatch.setattr(core_loader.importlib.util, "find_spec", lambda _: None)
    assert core_loader.core_source() == sibling


def test_missing_engine_explains_setup_without_modifying_import_path(tmp_path, monkeypatch):
    monkeypatch.setattr(core_loader, "__file__", str(tmp_path / "CWP" / "app" / "core_loader.py"))
    monkeypatch.setattr(core_loader.importlib.util, "find_spec", lambda _: None)
    before = list(core_loader.sys.path)
    with pytest.raises(RuntimeError, match="setup.bat"):
        core_loader.load_core()
    assert core_loader.sys.path == before


def test_cannot_switch_core_under_existing_sessions(tmp_path, monkeypatch):
    first, second = package(tmp_path / "one"), package(tmp_path / "two")
    monkeypatch.setitem(core_loader.sys.modules, "pixie_core", SimpleNamespace(
        __file__=str(first / "pixie_core" / "__init__.py")))
    with pytest.raises(RuntimeError, match="再起動"):
        core_loader.load_core(second)
