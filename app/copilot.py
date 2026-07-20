"""Copilot 連携（PrayLight subprocess 経由）。

Microsoft Copilot（Web版）に単発質問して回答を得る。エージェントの `ask_copilot` ツール
（同期実行）と、ログイン用ブラウザ起動から使う。PrayLight は別プロジェクト（../PrayLight）で、
`src/copilot_ask.py` が質問(stdin)→回答(stdout) を担う。

NWP の実装を CWP 用に移植（AWP のツールは同期関数なので subprocess.run を同期で呼ぶ）。
相対ファイルパスは pixie_core.get_workspace()（現ターンのセッション workspace）で解決する。
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from . import config


def _praylight_paths(script_name: str = "copilot_ask.py") -> tuple[Path, Path]:
    root = Path(config.settings.praylight_dir).expanduser()
    root = root if root.is_absolute() else (config.PROJECT_ROOT / root)
    root = root.resolve()
    py = (
        Path(config.settings.praylight_python).expanduser().resolve()
        if config.settings.praylight_python
        else root / ".venv" / "Scripts" / "python.exe"
    )
    # スクリプトはルート直下（PrayLight）または src/（AskCopilot 系）のどちらかに置かれる。
    root_level = root / script_name
    src_level = root / "src" / script_name
    script = root_level if root_level.exists() else (src_level if src_level.exists() else root_level)
    return script, py


def _last_error_line(stderr: bytes, fallback: str) -> str:
    lines = stderr.decode("utf-8", "replace").strip().splitlines()
    err = [ln for ln in lines if ln.startswith("エラー")]
    return (err or lines or [fallback])[-1]


def _praylight_root() -> Path:
    root = Path(config.settings.praylight_dir).expanduser()
    return (root if root.is_absolute() else (config.PROJECT_ROOT / root)).resolve()


def status() -> dict:
    """PrayLight の疎通状況（設定ボタンでの表示用）。"""
    script, py = _praylight_paths()
    return {
        "enabled": bool(config.settings.copilot_enabled),
        "praylight_dir": str(_praylight_root()),
        "script_ok": script.exists(),
        "python_ok": py.exists(),
    }


def _resolve_files(file_rels: list | None) -> tuple[list[str], str | None]:
    """添付ファイルを絶対パスに解決。相対はセッション workspace 基準。失敗時は (,, エラー文)。"""
    import pixie_core

    ws = pixie_core.get_workspace()
    out: list[str] = []
    for rel in file_rels or []:
        rel = str(rel)
        p = Path(rel)
        if not p.is_absolute():
            p = Path(ws) / rel if ws else p
        p = p.expanduser().resolve()
        if not p.is_file():
            return [], f"エラー: 添付ファイルが見つかりません: {rel}"
        out.append(str(p))
    return out, None


def ask(question: str, files: list | None = None) -> str:
    """PrayLight の copilot_ask.py を同期 subprocess で呼ぶ。質問は stdin 渡し。"""
    if not config.settings.copilot_enabled:
        return "エラー: Copilot 連携は無効です。⚙️ 設定でオンにしてください。"
    script, py = _praylight_paths()
    if not script.exists():
        return f"エラー: PrayLight が見つかりません（{script}）。設定の PrayLight フォルダを確認してください。"
    if not py.exists():
        return f"エラー: PrayLight の Python が見つかりません（{py}）。"

    file_args, ferr = _resolve_files(files)
    if ferr:
        return ferr
    args: list[str] = []
    for f in file_args:
        args += ["--file", f]

    upload_grace = 120 if file_args else 0
    timeout = config.settings.copilot_timeout + 30 + upload_grace
    try:
        proc = subprocess.run(
            [str(py), str(script), "--timeout", str(config.settings.copilot_timeout), *args],
            input=question.encode("utf-8"),
            capture_output=True,
            cwd=str(script.parent),
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return "エラー: Copilot の応答がタイムアウトしました。質問を短くするか、もう一度試してください。"
    except OSError as e:
        return f"エラー: PrayLight を起動できません: {e}"

    answer = proc.stdout.decode("utf-8", "replace").strip()
    if proc.returncode != 0 or not answer:
        detail = _last_error_line(proc.stderr, "詳細不明")
        return (f"エラー: Copilot から回答を取得できませんでした（{detail}）。"
                " PrayLight で `python src/start_browser.py` を実行し Copilot にログイン済みか確認してください。")
    # ツール結果として長すぎないよう軽く上限（エンジン側でも切り詰められる）。
    return answer[:8000]


def open_browser() -> str:
    """PrayLight のログイン用ブラウザを起動して Copilot を開く。成功なら ""、失敗ならエラー文。"""
    script, py = _praylight_paths("start_browser.py")
    if not script.exists():
        return f"エラー: PrayLight が見つかりません（{script}）。"
    if not py.exists():
        return f"エラー: PrayLight の Python が見つかりません（{py}）。"
    try:
        proc = subprocess.run([str(py), str(script)], capture_output=True, cwd=str(script.parent), timeout=30)
    except subprocess.TimeoutExpired:
        return "エラー: ブラウザの起動がタイムアウトしました。"
    except OSError as e:
        return f"エラー: PrayLight を起動できません: {e}"
    if proc.returncode != 0:
        return f"エラー: ブラウザを起動できませんでした（{_last_error_line(proc.stderr, '詳細不明')}）。"
    return ""


def url_to_markdown(url: str) -> str:
    """PrayLight の url2md.py で URL のページを Markdown 化する（🌐+ web2md）。

    成功なら Markdown 本文、失敗なら「エラー: ...」。保存が目的なので切り詰めない
    （NWP の url_to_markdown と同一仕様）。同期関数: /api/web2md から asyncio.to_thread 経由で呼ぶ。"""
    script, py = _praylight_paths("url2md.py")
    if not script.exists():
        return f"エラー: url2md.py が見つかりません（{script}）。PrayLight の url2md.py を確認してください。"
    if not py.exists():
        return f"エラー: PrayLight の Python が見つかりません（{py}）。"
    try:
        proc = subprocess.run([str(py), str(script), url], capture_output=True,
                              cwd=str(script.parent), timeout=330)
    except subprocess.TimeoutExpired:
        return "エラー: 変換がタイムアウトしました（ログイン待ちを含め5分超）。"
    except OSError as e:
        return f"エラー: PrayLight を起動できません: {e}"
    markdown = proc.stdout.decode("utf-8", "replace").strip()
    if proc.returncode != 0 or not markdown:
        return _last_error_line(proc.stderr, "エラー: 変換に失敗しました。")
    return markdown
