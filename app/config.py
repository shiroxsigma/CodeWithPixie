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


settings = Settings()


def _resolve(raw: str) -> Path:
    p = Path(raw).expanduser()
    return (p if p.is_absolute() else PROJECT_ROOT / p).resolve()


# ワークスペースは起動時固定（1プロセス1セッション前提。実行中切替は非対応）。
# 参照側は `from . import config` して config.WORKSPACE を読む（files.py 互換のため）。
WORKSPACE = _resolve(settings.workspace_root)
WORKSPACE.mkdir(parents=True, exist_ok=True)

AWP_SRC = _resolve(settings.awp_src)


def load_servers() -> list[dict]:
    """config.json の servers[] を読む（AWP と同形式）。無ければ設定値から単一構成を合成。"""
    data: dict = {}
    if CONFIG_JSON.exists():
        try:
            data = json.loads(CONFIG_JSON.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError:
            data = {}
    servers = data.get("servers") or []
    if not servers:
        servers = [{
            "name": "LM Studio",
            "base_url": settings.lmstudio_base_url,
            "api_key": settings.lmstudio_api_key,
            "model": settings.lmstudio_model,
        }]
    return servers
