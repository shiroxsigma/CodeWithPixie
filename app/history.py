"""保存前の内容をワークスペース内 `.pixie_history/` に退避する「ローカル履歴」。

なぜ要るか: `POST /api/file` は `files.write_file` を呼ぶだけで、旧内容はどこにも
残らなかった。エディタの Undo はブラウザを閉じれば消えるし、Note モードの自動保存は
人が Ctrl+S を押さなくてもディスクを書き換える。つまり「開いたまま別の内容を流し込んで
保存」が起きると取り返しがつかない。エージェントのターン単位バックアップ（`/api/rollback`）
は engine 側の仕組みで、UI 経由の保存はそこを通らない。その穴を塞ぐのがこのモジュール。

置き場所は**ワークスペース内**。ファイルと一緒に移動・バックアップされるべきものだから
（アプリ側に置くとワークスペースを移した瞬間に履歴が迷子になる）。ドット始まりなので
ファイルツリーにも検索にも出ない（`files.IGNORE_DIRS` にも登録済み）。

レイアウト（Explorer から人が直接漁れる形にしてある。最後の砦なので、アプリが起動
しなくても救出できることを優先した）::

    .pixie_history/
      docs/spec.md/            <- 元ファイルと同じ相対パス（ファイル名もフォルダになる）
        20260731-143022-481.md <- 保存直前の内容。拡張子は元のまま
        20260731-150114-002.md

間引き方針（`_prune`）: 直近 KEEP_RECENT 世代は無条件に残し、それより古いものは
「1日1世代」に間引く。自動保存で世代を使い切って前日の版が押し出される事故を防ぐため。
"""
from __future__ import annotations

import re
import shutil

from datetime import datetime
from pathlib import Path

from . import config
from .config import settings

#: 履歴ディレクトリ名（ワークスペース直下）。ドット始まり = ツリー・検索から自動的に隠れる。
DIR_NAME = ".pixie_history"

#: 直近この世代数までは間引かずに残す。
KEEP_RECENT = 30

#: 間引き後に残す世代数の上限（1日1世代の長期ぶんを含めた総数）。
MAX_TOTAL = 120

#: 直近の世代がこの秒数より新しければ、新しい世代を作らない。
#: Note モードの自動保存は 2 秒間隔で走るので、これが無いと打鍵数十回で履歴が
#: 全部「さっきの自分」で埋まり、肝心の「編集を始める前」が押し出される。
MIN_INTERVAL_SEC = 60.0

#: これより大きいファイルは退避しない（エディタで開ける上限より少し広く取る）。
MAX_SNAPSHOT_BYTES = 5_000_000

#: 世代ファイルの stem（= 版ID）の形式。API 引数の検証にも使う。
STAMP_RE = re.compile(r"^\d{8}-\d{6}-\d{3}$")


def history_root() -> Path:
    """現在のワークスペースの履歴ディレクトリ（存在しなくてもパスは返す）。"""
    return config.WORKSPACE / DIR_NAME


def _safe_rel(rel: str) -> str:
    """相対パスを検証して posix 形式に正規化する。ワークスペース外なら ValueError。

    `files.safe_path` と同じ判定を自前で持つのは、files → history の import 方向を
    一方向に保つため（files.write_file がこのモジュールを呼ぶ）。"""
    root = config.WORKSPACE
    p = (root / rel).resolve()
    if p != root and root not in p.parents:
        raise ValueError(f"path escapes workspace: {rel}")
    return p.relative_to(root).as_posix()


def _bucket(rel: str) -> Path:
    """そのファイルの世代を貯めるディレクトリ。"""
    return history_root().joinpath(*_safe_rel(rel).split("/"))


def _versions(bucket: Path) -> list[Path]:
    """世代ファイルを新しい順に返す。名前が時系列順なので名前でソートできる。"""
    if not bucket.is_dir():
        return []
    out = [p for p in bucket.iterdir() if p.is_file() and STAMP_RE.match(p.stem)]
    out.sort(key=lambda p: p.stem, reverse=True)
    return out


def _stamp(now: datetime) -> str:
    return f"{now:%Y%m%d-%H%M%S}-{now.microsecond // 1000:03d}"


def _parse_stamp(stem: str) -> datetime | None:
    try:
        return datetime.strptime(stem[:15], "%Y%m%d-%H%M%S")
    except ValueError:
        return None


def _prune(bucket: Path) -> None:
    """直近 KEEP_RECENT 世代はそのまま、それより古いものは1日1世代に間引く。

    「直近だけ N 世代」だと連続編集の1時間で前日の版が消える。「1日1世代だけ」だと
    さっき壊した分を戻せない。両方要るので二段構えにしている。"""
    versions = _versions(bucket)
    keep = versions[:KEEP_RECENT]
    seen_days: set[str] = set()
    for p in versions[KEEP_RECENT:]:
        day = p.stem[:8]
        if day in seen_days:
            p.unlink(missing_ok=True)
            continue
        seen_days.add(day)
        keep.append(p)
    for p in keep[MAX_TOTAL:]:
        p.unlink(missing_ok=True)


def snapshot(rel: str, now: datetime | None = None, force: bool = False) -> Path | None:
    """`rel` の**現在ディスク上の内容**を履歴へ退避する。書き込みの直前に呼ぶ。

    退避しない（None を返す）ケース:
      - 履歴機能が無効 / ファイルが無い（新規作成）/ 大きすぎる
      - 直近の世代と内容が同じ（保存を押しただけで中身は変わっていない）
      - 直近の世代が MIN_INTERVAL_SEC より新しい（自動保存の連打）

    `force=True` は MIN_INTERVAL_SEC の間引きだけを飛ばす。間引きは「自動保存の連打で
    履歴を食い潰さない」ためのものなので、**これから消える内容が他人の変更**であるとき
    （衝突を承知の上書き）に効かせてはいけない — 直前に自分が保存していただけで、相手の
    変更が退避されないまま消える。内容一致のスキップは force でも維持する（消えるものが
    無いので積む意味が無い）。

    履歴は「保存を邪魔しない」ことが最優先なので、失敗しても例外を投げない。
    """
    if not settings.history_enabled:
        return None
    try:
        src = config.WORKSPACE / _safe_rel(rel)
        if not src.is_file():
            return None  # 新規作成には守るべき旧内容が無い
        if src.stat().st_size > MAX_SNAPSHOT_BYTES:
            return None
        bucket = _bucket(rel)
        latest = _versions(bucket)[:1]
        if latest:
            newest = latest[0]
            stamped = _parse_stamp(newest.stem)
            now_dt = now or datetime.now()
            if not force and stamped and (now_dt - stamped).total_seconds() < MIN_INTERVAL_SEC:
                return None
            try:
                if newest.read_bytes() == src.read_bytes():
                    return None  # 内容が動いていないなら世代を増やす意味が無い
            except OSError:
                pass
        bucket.mkdir(parents=True, exist_ok=True)
        dst = bucket / f"{_stamp(now or datetime.now())}{src.suffix}"
        shutil.copy2(src, dst)
        _prune(bucket)
        return dst
    except (OSError, ValueError):
        # 履歴が取れなくても保存自体は通す（守るための仕組みで保存を落とさない）
        import logging

        logging.getLogger(__name__).warning("history snapshot failed: %s", rel, exc_info=True)
        return None


def list_versions(rel: str) -> list[dict]:
    """`rel` の世代一覧を新しい順で返す。要素は {id, saved_at, size}。"""
    out: list[dict] = []
    for p in _versions(_bucket(rel)):
        try:
            st = p.stat()
        except OSError:
            continue
        dt = _parse_stamp(p.stem)
        out.append({
            "id": p.stem,
            "saved_at": dt.isoformat(timespec="seconds") if dt else "",
            "size": st.st_size,
        })
    return out


def _version_path(rel: str, version_id: str) -> Path:
    if not STAMP_RE.match(version_id or ""):
        raise ValueError(f"不正な版IDです: {version_id}")
    bucket = _bucket(rel)
    for p in _versions(bucket):
        if p.stem == version_id:
            return p
    raise FileNotFoundError(f"その版は見つかりません: {rel}@{version_id}")


def read_version(rel: str, version_id: str) -> str:
    return _version_path(rel, version_id).read_text(encoding="utf-8", errors="replace")


def restore(rel: str, version_id: str) -> str:
    """`rel` を指定の版に戻す。戻す直前の内容も履歴に積むので、復元自体もやり直せる。

    復元後の内容を返す（呼び出し側がエディタへ載せ直せるように）。"""
    content = read_version(rel, version_id)
    target = config.WORKSPACE / _safe_rel(rel)
    # 「間違った版に戻した」を救えるように、現状を必ず1世代積む。連打の間引き
    # （MIN_INTERVAL_SEC）に巻き込まれると復元前の内容が残らないので直接書く。
    if target.is_file():
        try:
            bucket = _bucket(rel)
            bucket.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, bucket / f"{_stamp(datetime.now())}{target.suffix}")
            _prune(bucket)
        except OSError:
            import logging

            logging.getLogger(__name__).warning("pre-restore snapshot failed: %s", rel, exc_info=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return content
