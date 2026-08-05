"""Copilot 連携（PrayLight subprocess 経由）。

Microsoft Copilot（Web版）に単発質問して回答を得る。エージェントの `ask_copilot` ツール
（同期実行）と、ログイン用ブラウザ起動から使う。PrayLight は別プロジェクト（../PrayLight）で、
`src/copilot_ask.py` が質問(stdin)→回答(stdout) を担う。

NWP の実装を CWP 用に移植（AWP のツールは同期関数なので subprocess.run を同期で呼ぶ）。
相対ファイルパスは pixie_core.get_workspace()（現ターンのセッション workspace）で解決する。
"""
from __future__ import annotations

import subprocess
import tempfile
import threading
from pathlib import Path

from . import config
# ask() の引数名 `files`（添付リスト）と衝突するので別名で持つ。
from . import files as fsutil


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


def _last_error_line(stderr: str | bytes, fallback: str) -> str:
    """stderr から表示用の1行を選ぶ（「エラー: …」があればそれ、無ければ最終行）。

    bytes も受けるのは、進捗を流さない呼び出し（open_browser / _run_reader /
    url_to_markdown）が subprocess.run のまま bytes を渡してくるため。
    """
    if isinstance(stderr, bytes):
        stderr = stderr.decode("utf-8", "replace")
    lines = stderr.strip().splitlines()
    err = [ln for ln in lines if ln.startswith("エラー")]
    return (err or lines or [fallback])[-1]


#: PrayLight 自身が内部で持っている全体タイムアウト（copilot_ask.py の
#: `args.timeout + 150 + (120 if files else 0)`）に対する、こちら側の上乗せ余裕。
#: こちらの subprocess timeout が向こうより短いと、PrayLight が
#: 「アップロードが完了しませんでした」等の**具体的な理由**を書き出す前に kill して
#: しまい、毎回ただの「タイムアウトしました」しか出せなくなる。必ず長く取ること。
_OUTER_TIMEOUT_MARGIN = 30


def _praylight_timeout(has_files: bool) -> float:
    """PrayLight を待つ上限秒。向こうの内部予算より必ず長くする（上のコメント参照）。"""
    inner = config.settings.copilot_timeout + 150 + (120 if has_files else 0)
    return inner + _OUTER_TIMEOUT_MARGIN


def _run_streamed(cmd: list[str], cwd: str, payload: bytes, timeout: float,
                  on_progress) -> tuple[int, bytes, str]:
    """PrayLight を起動し、stderr を1行ずつ on_progress へ流しながら完了を待つ。

    subprocess.run では stderr を最後にまとめてしか受け取れない。PrayLight は
    「ファイルをアップロードしています…」「アップロード完了。」といった進捗を
    stderr に出すので、それを捨てると数分間まったく無反応に見える（実際に添付付きは
    数分かかる）。ここで拾って呼び出し側の status に流す。

    stdin/stdout/stderr をすべて別スレッドで捌くのは communicate() を使わないため。
    communicate() は自分で全パイプを読むので、stderr を横から読むと取り合いになる。
    """
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, cwd=cwd)
    out: list[bytes] = []
    err_lines: list[str] = []

    def pump_stdin() -> None:
        try:
            proc.stdin.write(payload)
        except OSError:
            pass  # 先に死んだ場合。原因は returncode / stderr 側で分かる
        finally:
            # close は必ず通す。write が失敗した経路で閉じ忘れると、子の
            # sys.stdin.read() が EOF を待ち続けて内部タイムアウトまで固まる。
            try:
                proc.stdin.close()
            except OSError:
                pass

    def pump_stdout() -> None:
        try:
            out.append(proc.stdout.read())
        except OSError:
            pass

    def pump_stderr() -> None:
        try:
            for raw in proc.stderr:
                line = raw.decode("utf-8", "replace").rstrip()
                if not line:
                    continue
                err_lines.append(line)
                if on_progress:
                    try:
                        on_progress(line)
                    except Exception:  # noqa: BLE001 - 進捗表示で本処理を落とさない
                        pass
        except OSError:
            pass

    workers = [threading.Thread(target=f, daemon=True)
               for f in (pump_stdin, pump_stdout, pump_stderr)]
    for w in workers:
        w.start()
    try:
        proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        # kill() は TerminateProcess で子1つだけ。PrayLight は配下に Playwright の
        # ドライバ（node.exe）を抱えるので、それごと畳まないと孤児が残る。さらに
        # node が生き残ると stderr パイプの write 端が閉じず、pump_stderr が EOF を
        # 見られないままスレッドが残留する。
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                       capture_output=True)
        proc.kill()
        proc.wait()
        raise
    finally:
        for w in workers:
            w.join(timeout=5)
    return proc.returncode, b"".join(out), "\n".join(err_lines)


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


def _attach_root() -> Path:
    """相対の添付パスを解決する基準フォルダ。

    ask_copilot（エージェントのツール）はターンスレッドの中で呼ばれるので
    pixie_core.get_workspace() が現セッションの workspace を返す。ところが
    /copilot・/copilot_simple は engine のターンの**外**（別スレッド）から ask() を
    呼ぶため、workspace は ContextVar で未束縛のまま None になる。そこを素通しすると
    相対パスがプロセスの cwd（＝CWP のプロジェクトフォルダ）基準で解決され、
    ワークスペース相対で渡された添付が必ず「見つかりません」になる。
    未束縛のときは現在のワークスペースを使う（file API と同じ基準）。
    """
    try:
        import pixie_core

        ws = pixie_core.get_workspace()
    except Exception:  # noqa: BLE001 - pixie_core 未 bootstrap でも添付は解決したい
        ws = None
    return Path(ws) if ws else config.WORKSPACE


#: 添付1件あたりの上限。Copilot 側の受け入れ上限は公表されていないが、これを超える
#: ものはまず通らない。抽出側の MAX_OFFICE_BYTES とは別枠（あちらは読むだけ）。
MAX_ATTACH_BYTES = 100_000_000


def _resolve_files(file_rels: list | None,
                   spill_dir: Path | None = None) -> tuple[list[str], str | None]:
    """添付ファイルを絶対パスに解決。相対は workspace 基準。失敗時は ([], エラー文)。

    読めるかをここで確かめるのは、ブラウザ自動操作の途中でアップロードに失敗すると、
    数十秒待たされた挙句に理由の分からないタイムアウトとして返ってくるため。

    Office で開いたままのファイルは、こちらの共有指定に FILE_SHARE_DELETE が無いと
    開けない（files._FILE_SHARE_ALL のコメント参照）。ブラウザのアップロードも同じ
    制約を踏むので、spill_dir があれば共有読みでコピーを作り、そのコピーを渡す
    — ユーザーに「Office を閉じてから出直せ」と言わずに済ませるため。
    """
    root = _attach_root()
    out: list[str] = []
    for i, rel in enumerate(file_rels or []):
        rel = str(rel)
        p = Path(rel)
        if not p.is_absolute():
            p = root / rel
        p = p.expanduser().resolve()
        if not p.is_file():
            return [], f"エラー: 添付ファイルが見つかりません: {rel}"
        # 上限超えはここで断る。どのみち Copilot 側のアップロード上限で弾かれるが、
        # 待たされた末に落ちるうえ、ロック中なら全量をメモリに載せてからそうなる。
        if p.stat().st_size > MAX_ATTACH_BYTES:
            mb = p.stat().st_size / 1_000_000
            return [], (f"エラー: 添付ファイルが大きすぎます: {p.name}（{mb:.0f}MB）。"
                        f"{MAX_ATTACH_BYTES // 1_000_000}MB 以下にしてください。")
        try:
            with p.open("rb"):
                out.append(str(p))
                continue
        except PermissionError:
            pass
        except OSError:
            return [], "エラー: " + fsutil.locked_message(p)
        if spill_dir is None:
            return [], "エラー: " + fsutil.locked_message(p)
        try:
            data = fsutil.read_bytes_shared(p)
        except OSError:
            return [], "エラー: " + fsutil.locked_message(p)
        # 連番のサブフォルダに置く: Copilot 側に出るファイル名を元のまま保ちつつ、
        # 同名の資料を2つ添付したときに上書きし合わないようにする。
        sub = spill_dir / str(i)
        sub.mkdir(parents=True, exist_ok=True)
        copy = sub / p.name
        copy.write_bytes(data)
        out.append(str(copy))
    return out, None


def ask(question: str, files: list | None = None, on_progress=None) -> str:
    """PrayLight の copilot_ask.py を同期 subprocess で呼ぶ。質問は stdin 渡し。

    on_progress(line: str) を渡すと、PrayLight が stderr に書く進捗
    （「ファイルをアップロードしています…」等）をそのつど通知する。添付付きの
    質問は数分かかることがあり、無通知だと固まったようにしか見えないため。
    """
    if not config.settings.copilot_enabled:
        return "エラー: Copilot 連携は無効です。⚙️ 設定でオンにしてください。"
    script, py = _praylight_paths()
    if not script.exists():
        return f"エラー: PrayLight が見つかりません（{script}）。設定の PrayLight フォルダを確認してください。"
    if not py.exists():
        return f"エラー: PrayLight の Python が見つかりません（{py}）。"

    # ロック中のファイルのコピー置き場。subprocess がアップロードし終わるまで
    # 実体が要るので、with の中で PrayLight の実行まで済ませる。
    # ignore_cleanup_errors: kill 直後はブラウザがコピーをまだ掴んでいることがあり、
    # 後始末の失敗で ask() ごと例外にすると、せっかく得た回答やエラー文を落とす。
    with tempfile.TemporaryDirectory(prefix="cwp-attach-", ignore_cleanup_errors=True) as spill:
        file_args, ferr = _resolve_files(files, Path(spill))
        if ferr:
            return ferr
        args: list[str] = []
        for f in file_args:
            args += ["--file", f]

        try:
            code, stdout, stderr = _run_streamed(
                [str(py), str(script), "--timeout", str(config.settings.copilot_timeout), *args],
                cwd=str(script.parent),
                payload=question.encode("utf-8"),
                timeout=_praylight_timeout(bool(file_args)),
                on_progress=on_progress,
            )
        except subprocess.TimeoutExpired:
            return "エラー: Copilot の応答がタイムアウトしました。質問を短くするか、もう一度試してください。"
        except OSError as e:
            return f"エラー: PrayLight を起動できません: {e}"

    answer = stdout.decode("utf-8", "replace").strip()
    if code != 0 or not answer:
        detail = _last_error_line(stderr, "詳細不明")
        return (f"エラー: Copilot から回答を取得できませんでした（{detail}）。"
                " PrayLight で `python src/start_browser.py` を実行し Copilot にログイン済みか確認してください。")
    # ここでは切り詰めない。ツール経由（ask_copilot）は note_tools._truncate が
    # tool_result_max_chars で切るので二重になり、/copilot 系は「表示のための回答」
    # なので切る理由が無い（以前の 8000 字は直行経路の回答まで黙って削っていた）。
    return answer


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


def _run_reader(script_name: str) -> str:
    """PrayLight の読み取り系スクリプトを実行して stdout を返す。失敗は「エラー: …」。"""
    script, py = _praylight_paths(script_name)
    if not script.exists():
        return f"エラー: スクリプトが見つかりません（{script}）。"
    if not py.exists():
        return f"エラー: PrayLight の Python が見つかりません（{py}）。"
    try:
        proc = subprocess.run([str(py), str(script)], capture_output=True,
                              cwd=str(script.parent), timeout=60)
    except subprocess.TimeoutExpired:
        return "エラー: 読み取りがタイムアウトしました。"
    except OSError as e:
        return f"エラー: PrayLight を起動できません: {e}"
    transcript = proc.stdout.decode("utf-8", "replace").strip()
    if proc.returncode != 0 or not transcript:
        return _last_error_line(proc.stderr, "エラー: 会話を取得できませんでした。")
    limit = config.settings.tool_result_max_chars
    if len(transcript) > limit:
        transcript = transcript[:limit] + f"\n…（長いため以降 {len(transcript) - limit} 文字を省略）"
    return transcript


def read_conversation() -> str:
    """開いている Copilot の会話ログ（Markdown）を取得する（⬇ 会話を取り込む）。

    1) UIA: 普段のブラウザの Copilot タブをアクセシビリティ API で読む（前面タブ必須）
    2) CDP: PrayLight の専用ブラウザから読む（フォールバック）
    成功なら本文、両方失敗なら「エラー: …」。NWP の read_copilot_conversation と同一仕様
    （同期関数: /api/copilot/read から asyncio.to_thread 経由で呼ぶ）。"""
    uia = _run_reader("copilot_read_uia.py")
    if not uia.startswith("エラー"):
        return uia
    cdp = _run_reader("copilot_read.py")
    if not cdp.startswith("エラー"):
        return cdp
    return (
        "エラー: 会話を取得できませんでした。\n"
        f"・通常ブラウザ(UIA): {uia.splitlines()[0]}\n"
        f"・専用ブラウザ(CDP): {cdp.splitlines()[0]}\n"
        "Copilot のタブをウィンドウの前面タブにしてから再試行してください。"
    )


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
