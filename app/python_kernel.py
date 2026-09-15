"""会話単位で保持する軽量な永続 Python 実行セッション。"""
from __future__ import annotations

import json
import os
import queue
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Callable


class KernelError(RuntimeError):
    pass


class PythonKernel:
    """1つの子Pythonプロセスと名前空間を複数セルにわたって維持する。"""

    def __init__(self, workspace: str | Path):
        self.workspace = Path(workspace).resolve()
        self._process: subprocess.Popen | None = None
        self._events: queue.Queue[dict] = queue.Queue(maxsize=128)
        self._lock = threading.Lock()
        self._state_lock = threading.RLock()
        self._generation = 0
        self._closed = False

    MAX_OUTPUT_CHARS = 100_000

    @property
    def alive(self) -> bool:
        with self._state_lock:
            return self._process is not None and self._process.poll() is None

    def _start(self) -> None:
        if self.alive:
            return
        env = os.environ.copy()
        project_root = str(Path(__file__).resolve().parents[1])
        env["PYTHONPATH"] = project_root + os.pathsep + env.get("PYTHONPATH", "")
        self._events = queue.Queue(maxsize=128)
        self._process = subprocess.Popen(
            [sys.executable, "-u", "-m", "app.python_kernel_worker"],
            cwd=str(self.workspace), env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace",
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        threading.Thread(target=self._read_stdout, args=(self._process, self._events), daemon=True).start()
        threading.Thread(target=self._read_stderr, args=(self._process, self._events), daemon=True).start()

    @staticmethod
    def _enqueue(proc, events, event):
        while proc.poll() is None:
            try:
                events.put(event, timeout=0.1)
                return
            except queue.Full:
                continue

    @staticmethod
    def _read_stdout(proc, events) -> None:
        with proc.stdout:
            for line in proc.stdout:
                try:
                    event = json.loads(line)
                    if not isinstance(event, dict):
                        raise ValueError("expected object")
                except ValueError:
                    event = {"type": "error", "text": "kernel protocol error: " + line}
                PythonKernel._enqueue(proc, events, event)

    @staticmethod
    def _read_stderr(proc, events) -> None:
        with proc.stderr:
            while text := proc.stderr.read(4096):
                PythonKernel._enqueue(proc, events, {"type": "error", "text": text})

    def _stop_process(self, proc) -> None:
        """古い実行の終了処理で、後続の再起動を取り消さない。"""
        with self._state_lock:
            if self._process is proc:
                self.stop()

    def execute(self, code: str, timeout: float = 30.0,
                on_output: Callable[[dict], None] | None = None,
                *, cancelled: Callable[[], bool] | None = None) -> str:
        timeout = max(0.1, min(float(timeout), 120.0))
        with self._state_lock:
            generation = self._generation
        with self._lock:
            with self._state_lock:
                if self._closed or generation != self._generation or (cancelled and cancelled()):
                    raise KernelError("Python実行は停止されました。")
                self._start()
                proc = self._process
                events = self._events
            if proc is None or proc.stdin is None:
                raise KernelError("Pythonカーネルを起動できませんでした。")
            try:
                proc.stdin.write(json.dumps({"op": "execute", "code": code}, ensure_ascii=False) + "\n")
                proc.stdin.flush()
            except (OSError, ValueError) as exc:
                self._stop_process(proc)
                raise KernelError("Pythonカーネルへの送信に失敗しました。") from exc
            deadline = time.monotonic() + timeout
            output: list[str] = []
            output_chars = 0
            while True:
                with self._state_lock:
                    if generation != self._generation:
                        raise KernelError("Python実行は停止されました。")
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    self._stop_process(proc)
                    raise KernelError(f"実行が{timeout:g}秒を超えたため停止しました。次の実行時に再起動します。")
                try:
                    event = events.get(timeout=min(remaining, 0.25))
                except queue.Empty:
                    if proc.poll() is not None:
                        self._stop_process(proc)
                        raise KernelError("Pythonカーネルが予期せず終了しました。")
                    continue
                kind = event.get("type")
                if kind == "done":
                    return "".join(output).rstrip() or "実行完了（出力なし）"
                text = str(event.get("text") or "")
                if kind in {"output", "result", "error"}:
                    label = str(event.get("stream") or kind)
                    output_chars += len(text)
                    if output_chars > self.MAX_OUTPUT_CHARS:
                        self._stop_process(proc)
                        raise KernelError("出力上限を超えたためPythonカーネルを停止しました。")
                    output.append(text)
                    if on_output:
                        try:
                            on_output({"type": label, "text": text})
                        except BaseException:
                            self._stop_process(proc)
                            raise

    def restart(self) -> None:
        self.stop()
        with self._state_lock:
            generation = self._generation
        with self._lock:
            with self._state_lock:
                if self._closed or generation != self._generation:
                    raise KernelError("Python実行は停止されました。")
                self._start()

    def close(self) -> None:
        """会話を破棄した後は新しいプロセスを作らない。"""
        with self._state_lock:
            self._closed = True
            self.stop()

    def stop(self) -> None:
        # executeのロックを待たずに実行中プロセスを止める。
        with self._state_lock:
            self._generation += 1
            proc, self._process = self._process, None
            if proc is None:
                return
            if proc.poll() is None:
                if os.name == "nt":
                    # Windowsのvenvランチャーは実際のPythonを子プロセスにする。
                    # ランチャーだけを止めると実行本体が残るためツリーを終了する。
                    subprocess.run(
                        ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                        creationflags=subprocess.CREATE_NO_WINDOW, timeout=5,
                        check=False,
                    )
                else:
                    proc.terminate()
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=2)
            if proc.stdin:
                proc.stdin.close()
