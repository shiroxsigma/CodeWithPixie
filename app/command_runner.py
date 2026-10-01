"""Bounded command execution with session cancellation and exit receipts."""
from __future__ import annotations

from datetime import datetime, timezone
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time
from typing import Callable


class _OutputBuffer:
    """Drain a pipe while retaining only its beginning and end."""

    def __init__(self, byte_limit: int):
        self.limit = byte_limit
        self.total = 0
        self.head = bytearray()
        self.tail = bytearray()

    def append(self, data: bytes) -> None:
        self.total += len(data)
        half = self.limit // 2
        remaining = max(0, half - len(self.head))
        self.head.extend(data[:remaining])
        self.tail.extend(data[remaining:])
        if len(self.tail) > self.limit - half:
            del self.tail[:len(self.tail) - (self.limit - half)]

    def text(self, char_limit: int) -> tuple[str, bool]:
        truncated = self.total > self.limit
        if truncated:
            text = _decode(bytes(self.head)) + "\n... (output truncated) ...\n" + _decode(bytes(self.tail))
        else:
            text = _decode(bytes(self.head + self.tail))
        text = text.strip()
        if len(text) > char_limit:
            marker = "\n... (output truncated) ...\n"
            half = (char_limit - len(marker)) // 2
            text = text[:half] + marker + text[-(char_limit - len(marker) - half):]
            truncated = True
        return text, truncated


def _decode(data: bytes) -> str:
    if not data:
        return ""
    if b"\x00" in data:
        try:
            return data.decode("utf-16le")
        except UnicodeDecodeError:
            pass
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp932" if os.name == "nt" else "utf-8", errors="replace")


def _read_pipe(stream, output: _OutputBuffer) -> None:
    try:
        while block := stream.read(64 * 1024):
            output.append(block)
    except (OSError, ValueError):
        pass
    finally:
        stream.close()


def _write_input(stream, content: str | None) -> None:
    try:
        if content:
            stream.write(content.encode("utf-8"))
            stream.flush()
    except (BrokenPipeError, OSError, ValueError):
        pass
    finally:
        stream.close()


def _stop_process_tree(process: subprocess.Popen) -> None:
    """Stop the command's children as well as its shell."""
    if os.name == "nt":
        if process.poll() is None:
            try:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW, timeout=3, check=False,
                )
            except (OSError, subprocess.TimeoutExpired):
                process.kill()
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=2)


def _notify(callback: Callable[[dict], None] | None, value: dict) -> None:
    if callback is not None:
        callback(value)


def run_command(
    command: str,
    working_directory: str | None = None,
    input: str | None = None,  # noqa: A002 - existing tool argument
    timeout: float = 30,
    *,
    workspace: str | Path | None = None,
    control=None,
    emit: Callable[[dict], None] | None = None,
    on_result: Callable[[dict], None] | None = None,
    max_output_chars: int = 4000,
) -> str:
    """Return the core tool's text result and report actual execution separately.

    ``control.check()`` exceptions propagate after process cleanup. ``on_result``
    receives one bounded receipt even for command timeout or a stopped turn.
    Relative directories resolve against the session workspace.
    """
    started = time.monotonic()
    started_at = datetime.now(timezone.utc).isoformat()
    process = None
    readers: list[threading.Thread] = []
    reason = None
    error = None
    caught = None
    cwd = None
    stdout = stderr = ""
    truncated = False
    try:
        timeout = float(timeout)
        if not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("timeout must be finite and positive")
        if not isinstance(command, str) or not command.strip():
            raise ValueError("command must be a nonempty string")
        if input is not None and not isinstance(input, str):
            raise ValueError("input must be a string")
        max_output_chars = max(128, int(max_output_chars))
        root = Path(workspace or Path.cwd()).resolve()
        cwd_path = Path(working_directory) if working_directory else root
        cwd = str((root / cwd_path).resolve() if not cwd_path.is_absolute() else cwd_path.resolve())
        if control is not None:
            control.check()
        # PowerShell otherwise maps every failing native exit code to 1. Keep
        # the native code and also recognize failures in PowerShell commands.
        powershell_command = (
            "$global:LASTEXITCODE = $null\n" + command
            + "\n$cwpCommandSucceeded = $?\n"
              "if (-not $cwpCommandSucceeded) {\n"
              "  if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\n"
              "  exit 1\n"
              "}\n"
              "if ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE }\n"
        )
        shell = (["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive",
                  "-ExecutionPolicy", "Bypass", "-Command", powershell_command]
                 if os.name == "nt" else ["bash", "-c", command])
        options = ({"creationflags": subprocess.CREATE_NO_WINDOW}
                   if os.name == "nt" else {"start_new_session": True})
        # Python tools print and read UTF-8; shell/native tools retain their own
        # encoding, which _decode handles without exposing the inherited env.
        process = subprocess.Popen(
            shell, cwd=cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, env={**os.environ, "PYTHONUTF8": "1",
                "PATH": str(Path(sys.executable).parent) + os.pathsep + os.environ.get("PATH", "")}, **options,
        )
        outputs = [_OutputBuffer(max_output_chars * 4) for _ in range(2)]
        for pipe, output in zip((process.stdout, process.stderr), outputs):
            reader = threading.Thread(target=_read_pipe, args=(pipe, output), daemon=True)
            reader.start()
            readers.append(reader)
        threading.Thread(target=_write_input, args=(process.stdin, input), daemon=True).start()
        _notify(emit, {"type": "status", "category": "command", "phase": "running",
                       "text": "Command started: " + command[:160]})
        deadline = started + timeout
        while True:
            if control is not None:
                control.check()
            if process.poll() is not None:
                break
            if time.monotonic() >= deadline:
                reason = "command_timeout"
                break
            time.sleep(min(0.05, max(0, deadline - time.monotonic())))
    except Exception as exc:
        reason = getattr(exc, "reason", None) or "execution_failed"
        error = f"{type(exc).__name__}: {exc}"
        if getattr(exc, "reason", None):
            caught = exc
    except BaseException as exc:
        reason = getattr(exc, "reason", None) or "stopped"
        caught = exc
    finally:
        if process is not None:
            if reason is not None:
                _stop_process_tree(process)
            # Ordinary foreground tools close their pipes at exit. A detached
            # child must not leave the request waiting for inherited pipes.
            for reader in readers:
                reader.join(timeout=0.5)
            if any(reader.is_alive() for reader in readers):
                _stop_process_tree(process)
                for reader in readers:
                    reader.join(timeout=0.5)
            if any(reader.is_alive() for reader in readers):
                # An exited Windows shell can leave a child holding its pipes.
                # Its actual exit code remains useful, but EOF and the command's
                # complete output were not observed, so it cannot verify a task.
                reason = reason or "incomplete_output"
            stdout, stdout_truncated = outputs[0].text(max_output_chars)
            stderr, stderr_truncated = outputs[1].text(max_output_chars)
            truncated = stdout_truncated or stderr_truncated
        exit_code = process.returncode if process is not None else None
        receipt = {
            "command": command, "cwd": cwd, "exit_code": exit_code,
            "pid": process.pid if process is not None else None,
            "started_at": started_at, "finished_at": datetime.now(timezone.utc).isoformat(),
            "duration_sec": round(time.monotonic() - started, 4),
            "stdout": stdout, "stderr": stderr, "output_truncated": truncated,
            "timed_out": reason == "command_timeout", "stop_reason": reason,
            "success": reason is None and exit_code == 0,
        }
        _notify(on_result, receipt)
        _notify(emit, {"type": "status", "category": "command", "phase": "finished",
                       "text": f"Command finished: {reason or f'exit {exit_code}'} "
                               f"({receipt['duration_sec']:.2f}s)"})
    if caught is not None:
        raise caught
    if reason == "command_timeout":
        return f"Execution Timeout: コマンドの実行が{timeout:g}秒を超えたため強制終了しました。"
    if reason is not None:
        return "Execution Failed: " + (error or reason)
    if exit_code != 0:
        return f"Error ({exit_code}):\n{stderr}\nOutput:\n{stdout}"
    return stdout or stderr or "Success: (出力なし)"
