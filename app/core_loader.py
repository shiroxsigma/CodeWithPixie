"""Resolve the shared engine without requiring a sibling checkout."""
from __future__ import annotations

import importlib
import importlib.util
from pathlib import Path
import sys


def core_source(override: str | Path | None = None) -> Path:
    """Return the import root: explicit checkout, installed package, dev fallback."""
    if override:
        source = Path(override).resolve()
        if not (source / "pixie_core" / "__init__.py").is_file():
            raise RuntimeError(f"awp_src に pixie_core がありません: {source}")
        return source
    spec = importlib.util.find_spec("pixie_core")
    if spec is not None and spec.origin:
        return Path(spec.origin).resolve().parent.parent
    sibling = Path(__file__).resolve().parents[2] / "AnythingWithPixie" / "src"
    if (sibling / "pixie_core" / "__init__.py").is_file():
        return sibling
    raise RuntimeError(
        "共通エンジンが見つかりません。setup.bat を実行してください。"
        "開発用チェックアウトは CWP_AWP_SRC で指定できます。"
    )


def load_core(override: str | Path | None = None):
    source = core_source(override)
    loaded = sys.modules.get("pixie_core")
    if loaded is not None:
        origin = Path(loaded.__file__).resolve().parent.parent
        if origin != source:
            raise RuntimeError("共通エンジンの読込先が変更されました。サーバーを再起動してください。")
    # Installed packages are already on the import path. Only explicit/development
    # checkouts require a path entry; do not install CLI modules into the Web app.
    if importlib.util.find_spec("pixie_core") is None or override:
        if str(source) in sys.path:
            sys.path.remove(str(source))
        sys.path.insert(0, str(source))
    return importlib.import_module("pixie_core")
