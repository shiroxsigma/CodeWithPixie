"""turndown（+ GFM プラグイン）を npm レジストリから取得し static/vendor へ配置する。

完全オフライン動作のためのベンダリング。初回に一度だけ実行すればよい。
    python scripts/fetch_turndown.py
UMD ビルドを1ファイルずつ取り出す（window.TurndownService / window.turndownPluginGfm）。
未取得でも app は動く — 貼り付けダイアログ（📥 貼付）がHTML変換なしの
プレーンテキスト挿入に縮退するだけ（index.html の <script> は 404 で素通し）。
"""
from __future__ import annotations

import io
import sys
import tarfile
import urllib.request
from pathlib import Path

DEST = Path(__file__).resolve().parent.parent / "static" / "vendor" / "turndown"

# (表示名, npm tarball URL, tarball 内メンバーの候補, 配置ファイル名, 含まれるべきグローバル名)
PACKAGES = [
    (
        "turndown",
        "https://registry.npmjs.org/turndown/-/turndown-7.2.0.tgz",
        ["package/dist/turndown.js", "package/lib/turndown.umd.js"],
        "turndown.umd.js",
        "TurndownService",
    ),
    (
        "turndown-plugin-gfm",
        "https://registry.npmjs.org/turndown-plugin-gfm/-/turndown-plugin-gfm-1.0.2.tgz",
        ["package/dist/turndown-plugin-gfm.js", "package/lib/turndown-plugin-gfm.js"],
        "turndown-plugin-gfm.js",
        "turndownPluginGfm",
    ),
]


def fetch_one(name: str, url: str, members: list[str], out_name: str, marker: str) -> bool:
    print(f"downloading {name} …")
    try:
        raw = urllib.request.urlopen(url, timeout=60).read()
    except Exception as e:  # noqa: BLE001
        print(f"取得失敗: {e}", file=sys.stderr)
        return False

    data = None
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tf:
        for member in members:
            try:
                info = tf.getmember(member)
            except KeyError:
                continue
            if info.isfile():
                with tf.extractfile(info) as src:
                    data = src.read()
                break
    if data is None:
        print(f"展開失敗: tarball 内に {members} のいずれも見つかりません。", file=sys.stderr)
        return False
    if marker.encode() not in data:
        print(f"警告: 取得したファイルに {marker} が含まれていません（ビルドが変わった可能性）。",
              file=sys.stderr)

    DEST.mkdir(parents=True, exist_ok=True)
    target = DEST / out_name
    target.write_bytes(data)
    print(f"完了: {target}（{target.stat().st_size:,} bytes）を配置しました。")
    return True


def main() -> int:
    ok = all(fetch_one(*pkg) for pkg in PACKAGES)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
