"""Real process tests for cancellation, receipts and bounded command output."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import time

import pytest

from app.command_runner import run_command
from pixie_core.turn_control import TurnControl, TurnLimits, TurnStopped


def _python_command(script: Path) -> str:
    if os.name == "nt":
        quote = lambda value: "'" + str(value).replace("'", "''") + "'"
        return "& " + quote(sys.executable) + " " + quote(script)
    return shlex.quote(sys.executable) + " " + shlex.quote(str(script))


def _script(tmp_path, content, name="command.py"):
    script = tmp_path / name
    script.write_text(content, encoding="utf-8")
    return _python_command(script)


def _running(pid: int) -> bool:
    if os.name == "nt":
        result = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW,
            timeout=3,
        )
        return f'"{pid}"'.encode() in result.stdout
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    stat = Path(f"/proc/{pid}/stat")
    return not (stat.exists() and stat.read_text().split(")", 1)[1].split()[0] == "Z")


def test_success_receipt_records_real_cwd_exit_and_unicode(tmp_path):
    target = tmp_path / "nested"
    target.mkdir()
    command = _script(tmp_path, "from pathlib import Path\nprint(Path.cwd())\nprint('日本語')\n")
    receipts, events = [], []
    result = run_command(command, "nested", workspace=tmp_path,
                         emit=events.append, on_result=receipts.append)
    assert str(target) in result
    assert "日本語" in result
    assert len(receipts) == 1
    receipt = receipts[0]
    assert receipt["success"] and receipt["exit_code"] == 0
    assert receipt["cwd"] == str(target)
    assert receipt["duration_sec"] > 0
    assert receipt["stop_reason"] is None
    assert [event["phase"] for event in events] == ["running", "finished"]


def test_failure_retains_legacy_error_prefix_and_stderr(tmp_path):
    command = _script(tmp_path, "import sys\nprint('details')\nprint('broken', file=sys.stderr)\nsys.exit(7)\n")
    receipts = []
    result = run_command(command, workspace=tmp_path, on_result=receipts.append)
    assert result.startswith("Error (7):")
    assert "details" in result and "broken" in result
    assert receipts[0]["exit_code"] == 7
    assert not receipts[0]["success"]


@pytest.mark.skipif(os.name != "nt", reason="PowerShell exit code behavior")
def test_powershell_error_after_successful_native_command_is_failure(tmp_path):
    command = _script(tmp_path, "pass\n") + "\nWrite-Error 'broken'"
    receipts = []
    result = run_command(command, workspace=tmp_path, on_result=receipts.append)
    assert result.startswith("Error (1):")
    assert "broken" in result
    assert not receipts[0]["success"]


@pytest.mark.skipif(os.name != "nt", reason="Windows shell can exit before inherited child pipes close")
def test_exited_shell_with_live_child_pipes_cannot_report_verification_success(tmp_path):
    marker = tmp_path / "done.txt"
    helper = tmp_path / "short_child.py"
    helper.write_text(
        "from pathlib import Path\nimport time\ntime.sleep(3)\n"
        "print('late child output', flush=True)\n"
        f"Path({str(marker)!r}).write_text('done')\n", encoding="utf-8")
    quote = lambda value: "'" + str(value).replace("'", "''") + "'"
    command = "\n".join([
        "$info = New-Object System.Diagnostics.ProcessStartInfo",
        "$info.FileName = " + quote(sys.executable),
        "$info.Arguments = " + quote('-u "' + str(helper) + '"'),
        "$info.UseShellExecute = $false",
        "$info.CreateNoWindow = $true",
        "$child = [System.Diagnostics.Process]::Start($info)",
        "Write-Output 'shell finished'",
    ])
    receipts = []
    try:
        result = run_command(command, workspace=tmp_path, on_result=receipts.append)
        assert result.startswith("Execution Failed:")
        assert receipts[0]["exit_code"] == 0, "record the shell's actual code without interpreting it as completion"
        assert receipts[0]["stop_reason"] == "incomplete_output"
        assert not receipts[0]["success"]
        assert not marker.exists(), "the short child must still own the pipes when the runner returns"
    finally:
        # This helper deliberately outlives its shell but always exits naturally
        # after three seconds; leave no background test process behind.
        deadline = time.monotonic() + 5
        while not marker.exists() and time.monotonic() < deadline:
            time.sleep(0.025)
        assert marker.exists()


def test_no_output_and_stdin_contract(tmp_path):
    empty = _script(tmp_path, "pass\n", name="empty.py")
    assert run_command(empty, workspace=tmp_path) == "Success: (出力なし)"
    echo = _script(tmp_path, "import sys\nprint(sys.stdin.read())\n", name="echo.py")
    assert run_command(echo, input="こんにちは\n", workspace=tmp_path) == "こんにちは"


def test_output_is_drained_and_bounded_with_head_and_tail(tmp_path):
    command = _script(tmp_path, "print('START' + 'x' * 500000 + 'END')\n")
    receipts = []
    result = run_command(command, workspace=tmp_path, max_output_chars=512,
                         on_result=receipts.append)
    assert len(result) <= 512
    assert result.startswith("START") and result.endswith("END")
    assert "output truncated" in result
    assert receipts[0]["output_truncated"]
    assert receipts[0]["exit_code"] == 0


def test_timeout_stops_command_with_a_failed_receipt(tmp_path):
    command = _script(tmp_path, "import time\ntime.sleep(30)\n")
    receipts = []
    started = time.monotonic()
    result = run_command(command, timeout=0.3, workspace=tmp_path, on_result=receipts.append)
    assert result.startswith("Execution Timeout:")
    assert time.monotonic() - started < 5
    assert receipts[0]["timed_out"]
    assert not receipts[0]["success"]
    assert receipts[0]["exit_code"] != 0


def test_cancel_kills_command_and_its_child_then_propagates(tmp_path):
    marker = tmp_path / "pids.json"
    child = tmp_path / "child.py"
    child.write_text("import time\ntime.sleep(30)\n", encoding="utf-8")
    command = _script(tmp_path,
        "import json, os, subprocess, sys, time\n"
        "from pathlib import Path\n"
        f"child = subprocess.Popen([sys.executable, {str(child)!r}])\n"
        f"Path({str(marker)!r}).write_text(json.dumps([os.getpid(), child.pid]))\n"
        "time.sleep(30)\n")
    control = TurnControl(TurnLimits(timeout=20))
    receipts = []
    with ThreadPoolExecutor() as pool:
        future = pool.submit(run_command, command, timeout=20, workspace=tmp_path,
                             control=control, on_result=receipts.append)
        try:
            deadline = time.monotonic() + 8
            while not marker.exists() and time.monotonic() < deadline:
                time.sleep(0.025)
            assert marker.exists(), "test process did not start"
            pids = json.loads(marker.read_text())
            started = time.monotonic()
            control.cancel()
            with pytest.raises(TurnStopped, match="cancelled"):
                future.result(timeout=5)
            assert time.monotonic() - started < 5
            assert all(not _running(pid) for pid in pids)
        finally:
            control.cancel()
    assert len(receipts) == 1
    assert receipts[0]["stop_reason"] == "cancelled"
    assert not receipts[0]["success"]


def test_turn_deadline_takes_precedence_over_command_timeout(tmp_path):
    command = _script(tmp_path, "import time\ntime.sleep(30)\n")
    control = TurnControl(TurnLimits(timeout=0.3))
    receipts = []
    started = time.monotonic()
    with pytest.raises(TurnStopped, match="turn_timeout"):
        run_command(command, timeout=20, workspace=tmp_path,
                    control=control, on_result=receipts.append)
    assert time.monotonic() - started < 5
    assert receipts[0]["stop_reason"] == "turn_timeout"
    assert not receipts[0]["success"]


@pytest.mark.parametrize("timeout", [0, -1, float("nan"), float("inf")])
def test_invalid_limits_fail_without_starting_a_process(tmp_path, timeout):
    receipts = []
    result = run_command("unused", timeout=timeout, workspace=tmp_path, on_result=receipts.append)
    assert result.startswith("Execution Failed:")
    assert receipts[0]["exit_code"] is None
    assert not receipts[0]["success"]
