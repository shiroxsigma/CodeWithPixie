"""CodeWithPixie 設定。config.json / 環境変数 (CWP_*) / .env で上書き可能。

優先順位: 環境変数 > .env > config.json > デフォルト値。

CodeWithPixie は AnythingWithPixie (AWP) のエンジンを sys.path 経由で読み込み、
Web(FastAPI) から自律コード修正エージェントとして駆動する。LLM 接続は AWP の
LMStudioBackend が担うため、本アプリは接続先(servers)とワークスペースだけを持つ。
"""
import json
from pathlib import Path

from pydantic_settings import (
    BaseSettings,
    JsonConfigSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_JSON = PROJECT_ROOT / "config.json"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CWP_",
        json_file=CONFIG_JSON,
        json_file_encoding="utf-8-sig",  # メモ帳保存の BOM 付き UTF-8 も許容
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            JsonConfigSettingsSource(settings_cls),
            file_secret_settings,
        )

    # --- AnythingWithPixie エンジンの所在（sys.path に前置される） ---
    # 相対パスはプロジェクトルート基準で解決する。
    awp_src: str = "../AnythingWithPixie/src"

    # --- エージェントが作業する対象フォルダ（サンドボックス兼 cwd） ---
    # 起動時にこの下へ os.chdir する。AWP の永続状態(.pixie_notes/)もここに作られる。
    # 相対パスはプロジェクトルート基準。
    workspace_root: str = "./workspace"

    # --- LM Studio (OpenAI 互換) 接続。config.json の servers[] を優先 ---
    # servers 未設定時に使うフォールバック単一サーバー。
    lmstudio_base_url: str = "http://localhost:1234/v1"
    lmstudio_api_key: str = "lm-studio"
    lmstudio_model: str = "local-model"

    # --- サーバ（ローカル専用にバインド） ---
    host: str = "127.0.0.1"
    port: int = 8770

    # ripgrep のパス（PATH にあれば "rg" のまま）。ファイル検索 API 用。
    rg_path: str = "rg"

    # 承認待ちのタイムアウト秒。0 以下で無期限（推奨: 離席でターンが死なない）。
    approval_timeout: float = 0.0

    # --- Copilot 連携（PrayLight subprocess 経由で Microsoft Copilot に単発質問）---
    # copilot_enabled=True でエージェントに ask_copilot ツールを提供する（⚙️ 設定でトグル）。
    copilot_enabled: bool = False
    praylight_dir: str = "../PrayLight"   # PrayLight プロジェクトのルート
    praylight_python: str = ""            # 空なら {praylight_dir}/.venv/Scripts/python.exe
    copilot_timeout: float = 120.0        # Copilot 応答待ちの上限秒


settings = Settings()


def _resolve(raw: str) -> Path:
    p = Path(raw).expanduser()
    return (p if p.is_absolute() else PROJECT_ROOT / p).resolve()


# ワークスペースは起動時固定（1プロセス1セッション前提。実行中切替は非対応）。
# 参照側は `from . import config` して config.WORKSPACE を読む（files.py 互換のため）。
WORKSPACE = _resolve(settings.workspace_root)
WORKSPACE.mkdir(parents=True, exist_ok=True)

AWP_SRC = _resolve(settings.awp_src)


def _read_config_json() -> dict:
    if CONFIG_JSON.exists():
        try:
            return json.loads(CONFIG_JSON.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError:
            return {}
    return {}


def _write_config_json(data: dict) -> None:
    CONFIG_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_servers() -> list[dict]:
    """config.json の servers[] を読む（AWP と同形式）。無ければ設定値から単一構成を合成。"""
    servers = _read_config_json().get("servers") or []
    if not servers:
        servers = [{
            "name": "LM Studio",
            "base_url": settings.lmstudio_base_url,
            "api_key": settings.lmstudio_api_key,
            "model": settings.lmstudio_model,
        }]
    return servers


#: 現在アクティブなサーバの index（新規セッションが使う）。config.json に永続化。
def get_active_server_index() -> int:
    idx = _read_config_json().get("active_server", 0)
    n = len(load_servers())
    return idx if isinstance(idx, int) and 0 <= idx < n else 0


def set_active_server_index(idx: int) -> None:
    servers = load_servers()
    if not (0 <= idx < len(servers)):
        raise ValueError(f"サーバ番号が範囲外です: {idx}")
    data = _read_config_json()
    data["active_server"] = idx
    _write_config_json(data)


def active_server() -> dict:
    return load_servers()[get_active_server_index()]


def set_copilot_enabled(enabled: bool) -> bool:
    """Copilot 連携の on/off を切り替え、config.json に永続化する。"""
    data = _read_config_json()
    data["copilot_enabled"] = bool(enabled)
    _write_config_json(data)
    settings.copilot_enabled = bool(enabled)
    return settings.copilot_enabled


def set_workspace(raw: str) -> Path:
    """作業対象フォルダ（ファイルブラウザ＋新規セッションの workspace）を切り替え、config.json に永続化する。"""
    global WORKSPACE
    raw = (raw or "").strip()
    if not raw:
        raise ValueError("パスを指定してください。")
    p = _resolve(raw)
    if p.is_file():
        raise ValueError(f"ファイルが指定されました。フォルダを指定してください: {p}")
    p.mkdir(parents=True, exist_ok=True)
    data = _read_config_json()
    data["workspace_root"] = str(p)
    _write_config_json(data)
    settings.workspace_root = str(p)
    WORKSPACE = p
    return p
