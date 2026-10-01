"""Live two-stage project repair and checkpoint evaluation in an isolated fixture.

Run with the project's Python environment. The 35 checkpoint filler exchanges
are synthetic saved messages; only the two project tasks call the live model.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from importlib import metadata
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


TEST_TOTALS = """import unittest
from math_ops import subtotal
from checkout import total

class TestTotals(unittest.TestCase):
    def test_subtotal_uses_quantity(self):
        self.assertEqual(subtotal(12, 3), 36)
    def test_empty(self):
        self.assertEqual(total([]), 0)
    def test_single(self):
        self.assertEqual(total([(12, 1)]), 12)
    def test_multiple_quantities(self):
        self.assertEqual(total([(12, 3), (5, 2)]), 46)
"""

TEST_DISCOUNT = """import unittest
from checkout import total

class TestDiscount(unittest.TestCase):
    def test_percent_discount(self):
        self.assertAlmostEqual(total([(10, 2), (5, 2)], discount=10), 27)
    def test_default_discount_preserves_totals(self):
        self.assertEqual(total([(10, 2), (5, 2)]), 30)
    def test_zero_discount(self):
        self.assertEqual(total([(8, 3)], discount=0), 24)
    def test_discount_on_empty(self):
        self.assertEqual(total([], discount=25), 0)
"""


def dump(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")


def source_hashes(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*.py"))
        if not any(part == "__pycache__" or part.startswith(".pixie") for part in path.relative_to(root).parts)
    }


def protected_hashes(root: Path) -> dict[str, str]:
    return {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.glob("test_*.py"))
    }


def command_for_tests() -> str:
    if os.name == "nt":
        executable = "'" + sys.executable.replace("'", "''") + "'"
        return f"& {executable} -B -m unittest -q"
    return f"{shlex.quote(sys.executable)} -B -m unittest -q"


def independent_oracle(workspace: Path) -> dict:
    started = time.monotonic()
    before = source_hashes(workspace)
    try:
        process = subprocess.run(
            [sys.executable, "-B", "-m", "unittest", "-q"],
            cwd=workspace, capture_output=True, text=True, encoding="utf-8", errors="replace",
            env={**os.environ, "PYTHONUTF8": "1"}, timeout=30,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        output = process.stdout + process.stderr
        counts = re.findall(r"Ran\s+(\d+)\s+tests?", output)
        return {
            "exit_code": process.returncode, "stdout": process.stdout, "stderr": process.stderr,
            "tests_run": int(counts[-1]) if counts else 0,
            "sources_before": before, "sources_after": source_hashes(workspace),
            "duration_sec": round(time.monotonic() - started, 4),
        }
    except Exception as exc:
        return {"exit_code": None, "error": f"{type(exc).__name__}: {exc}", "tests_run": 0,
                "duration_sec": round(time.monotonic() - started, 4)}


def revision(directory: Path) -> str | None:
    result = subprocess.run(["git", "-C", str(directory), "rev-parse", "HEAD"],
                            capture_output=True, text=True,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    return result.stdout.strip() if result.returncode == 0 else None


def snapshot(workspace: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for path in workspace.glob("*.py"):
        shutil.copy2(path, destination / path.name)


def evaluate_stage(session, prompt: str, command: str, run_dir: Path, name: str,
                   *, require_initial_failure=False) -> dict:
    from app import command_runner, note_prompts

    workspace = Path(session.workspace)
    stage_dir = run_dir / name
    stage_dir.mkdir()
    snapshot(workspace, stage_dir / "before")
    before = source_hashes(workspace)
    protected = protected_hashes(workspace)
    approvals, errors, actual_commands, metrics = [], [], [], []
    started = time.monotonic()
    original_runner = command_runner.run_command
    turn_id = None
    result = {"name": name, "prompt": prompt, "command": command}

    with (stage_dir / "events.jsonl").open("w", encoding="utf-8") as event_log:
        def emit(event):
            value = {"elapsed_sec": round(time.monotonic() - started, 4), **event}
            event_log.write(json.dumps(value, ensure_ascii=False, default=str) + "\n")
            event_log.flush()
            if event.get("type") == "approval":
                approvals.append(event)
                session.resolve_approval(event["id"], False)
            if event.get("type") == "error":
                errors.append(event.get("text"))
            if event.get("type") == "turn_metrics":
                metrics.append(event.get("metrics") or {})
            if event.get("type") in {"status", "error", "turn_metrics", "approval"}:
                text = str(event.get("text") or "")
                if event.get("type") == "turn_metrics":
                    item = event.get("metrics") or {}
                    text = (f"LLM calls={len(item.get('llm_calls') or [])} "
                            f"tools={item.get('tool_calls')} exit={item.get('exit_reason')}")
                print(f"[{name} {value['elapsed_sec']:.1f}s] {text[:240]}", flush=True)

        def observed_runner(*args, **kwargs):
            on_result = kwargs.get("on_result")
            sources_before = source_hashes(workspace)

            def finished(receipt):
                value = {**receipt, "fixture_sources_before": sources_before,
                         "fixture_sources_after": source_hashes(workspace)}
                actual_commands.append(value)
                dump(stage_dir / "actual-command-receipts.json", actual_commands)
                if on_result is not None:
                    on_result(receipt)

            return original_runner(*args, **{**kwargs, "on_result": finished})

        try:
            if not session.reserve_turn():
                raise RuntimeError("evaluation session is busy")
            session.configure_autonomy(True, command, user_request=prompt)
            session.set_workspace_snapshot("", "", [])
            workset = session.build_workset(prompt, "checkout.py", [])
            user_text = note_prompts.build_workset_user_text(prompt, "", workset, "checkout.py")
            (stage_dir / "prepared-user-text.txt").write_text(user_text, encoding="utf-8")
            turn_id = session.begin_turn(prompt)
            session.prepare_turn_snapshot(turn_id)
            emit({"type": "workset", "workset": workset})
            command_runner.run_command = observed_runner
            session.run_turn(user_text, emit, approval_timeout=1)
        except BaseException as exc:
            result["error"] = f"{type(exc).__name__}: {exc}"
            print(f"[{name}] {result['error']}", flush=True)
        finally:
            command_runner.run_command = original_runner
            if turn_id is not None:
                session.end_turn()
            if session.busy.locked():
                session.release_turn()

    result["duration_sec"] = round(time.monotonic() - started, 4)
    snapshot(workspace, stage_dir / "after")
    final_hashes = source_hashes(workspace)
    receipt = session._autonomous_run.receipt or {}
    memory_path = session._memory.path
    memory = json.loads(memory_path.read_text(encoding="utf-8"))
    dump(stage_dir / "saved-memory.json", memory)
    oracle = independent_oracle(workspace)
    dump(stage_dir / "independent-oracle.json", oracle)
    actual_success = any(
        item.get("command") == command and item.get("cwd") == str(workspace)
        and item.get("exit_code") == 0 and not item.get("stop_reason")
        and item["fixture_sources_before"] == item["fixture_sources_after"] == final_hashes
        for item in actual_commands
    )
    memory_success = any(
        item.get("command") == command and item.get("exit_code") == 0
        for item in memory.get("commands", [])
    )
    first = actual_commands[0] if actual_commands else {}
    initial_failure = bool(
        first.get("command") == command and first.get("exit_code") not in (0, None)
        and first.get("fixture_sources_before") == first.get("fixture_sources_after") == before
    )
    checks = {
        "completed_outcome": session.outcome.get("status") == "completed",
        "fresh_verification": session._autonomous_run.verified(),
        "actual_successful_command": actual_success,
        "actual_success_recorded_in_memory": memory_success,
        "protected_tests_unchanged": protected_hashes(workspace) == protected,
        "independent_oracle_passed": oracle.get("exit_code") == 0 and oracle.get("tests_run", 0) > 0,
        "oracle_preserved_sources": oracle.get("sources_before") == oracle.get("sources_after") == final_hashes,
        "no_unexpected_approvals": not approvals,
        "no_error_events": not errors,
        "initial_failure_confirmed_before_edit": initial_failure if require_initial_failure else True,
    }
    result.update({"passed": all(checks.values()) and "error" not in result, "checks": checks,
                   "outcome": session.outcome, "metrics": metrics, "command_receipt": receipt,
                   "command_executions": len(actual_commands), "initial_source_hashes": before,
                   "final_source_hashes": final_hashes, "protected_test_hashes": protected,
                   "approval_count": len(approvals), "errors": errors})
    dump(stage_dir / "result.json", result)
    print(f"[{name}] passed={result['passed']} duration={result['duration_sec']}s", flush=True)
    return result


def run(args) -> int:
    from app import config, engine_adapter
    from app.core_loader import core_source
    from app.session_memory import SessionMemory

    run_dir = (Path(args.output).expanduser().resolve() if args.output else
               ROOT / "logs" / ("autonomy-" + datetime.now().strftime("%Y%m%d-%H%M%S")))
    # Existing artifacts are never overwritten or used as model workspaces.
    run_dir.mkdir(parents=True, exist_ok=False)
    workspace = run_dir / "workspace"
    workspace.mkdir()
    (workspace / "math_ops.py").write_text("def subtotal(price, quantity):\n    return price\n", encoding="utf-8")
    (workspace / "checkout.py").write_text(
        "from math_ops import subtotal\n\ndef total(items):\n"
        "    return sum(subtotal(price, quantity) for price, quantity in items) + 5\n", encoding="utf-8")
    (workspace / "test_totals.py").write_text(TEST_TOTALS, encoding="utf-8")
    command = command_for_tests()
    server = {"name": "Autonomy evaluation", "base_url": args.base_url,
              "model": args.model, "api_key": "local"}
    core = engine_adapter.bootstrap(config.AWP_SRC)
    core_root = core_source(config.AWP_SRC)
    core_revision = None
    try:
        distribution = metadata.distribution("anythingpixie")
        package_version = distribution.version
        direct_url = json.loads(distribution.read_text("direct_url.json") or "{}")
        core_revision = (direct_url.get("vcs_info") or {}).get("commit_id")
        if not core_revision:
            match = re.search(r"/archive/([0-9a-f]{7,40})(?:[./]|$)", direct_url.get("url", ""))
            core_revision = match.group(1) if match else None
    except metadata.PackageNotFoundError:
        package_version = None
    if (core_root.parent / ".git").exists():
        core_revision = revision(core_root.parent)
    source_dir = run_dir / "sources"
    source_dir.mkdir()
    shutil.copytree(ROOT / "app", source_dir / "app", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.copytree(core_root / "pixie_core", source_dir / "pixie_core",
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.copy2(__file__, source_dir / "evaluate_autonomous.py")
    manifest = {
        "started_at": datetime.now(timezone.utc).isoformat(), "server": {k: server[k] for k in ("base_url", "model")},
        "cwp_revision": revision(ROOT), "core_revision": core_revision,
        "core_api_version": core.API_VERSION, "core_package_version": package_version,
        "app_source_hashes": source_hashes(ROOT / "app"),
        "core_source_hashes": source_hashes(core_root / "pixie_core"),
        "harness_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "source_execution": (
            "The live process imports app and pixie_core from the configured runtime locations. "
            "sources/ contains identified source snapshots taken at evaluation startup; "
            "the live process does not execute those snapshots."
        ),
        "python": sys.version, "python_executable": sys.executable, "platform": sys.platform,
        "verification_command": command, "live_model_turns": 2, "synthetic_saved_memory_turns": 35,
        "limits": {name: getattr(config.settings, name) for name in (
            "turn_timeout_sec", "turn_max_llm_calls", "turn_max_tool_calls", "think_budget_sec",
            "autonomous_recovery_rounds", "session_context_max_chars")},
    }
    dump(run_dir / "manifest.json", manifest)
    print("RUN_DIR=" + str(run_dir), flush=True)
    initial = independent_oracle(workspace)
    dump(run_dir / "initial-failing-oracle.json", initial)
    summary = {"passed": False, "stages": [], "memory_restore": {}, "artifact": str(run_dir)}
    session = None
    started = time.monotonic()
    session_id = "autonomous-project-evaluation"
    try:
        if initial.get("exit_code") in (0, None):
            raise RuntimeError("the initial fixture did not fail independently")
        session = engine_adapter.AgentSession(core, server, workspace)
        session.bind_memory(session_id)
        first_prompt = (
            "このプロジェクトの小計と合計の不具合を修正してください。\n"
            "元の制約: test_*.pyは変更禁止。既存テストの変更・削除で通過させないでください。\n"
            "小計は price * quantity、合計は各小計の和で、追加手数料はなしです。\n"
            "最初に指定コマンドで失敗を確認し、関連する複数ファイルを読み、修正して再実行してください。\n"
            f"指定コマンド: {command}\n成功を確認してから変更と結果を短く報告してください。"
        )
        first = evaluate_stage(session, first_prompt, command, run_dir, "stage1",
                               require_initial_failure=True)
        summary["stages"].append(first)
        dump(run_dir / "summary.json", summary)
        if not first["passed"]:
            return 1

        session.close()
        session = None
        memory = SessionMemory(workspace, session_id)
        filler = []
        for number in range(35):
            filler.extend([
                {"role": "user", "content": f"作業記録用の情報交換 {number + 1}。新しい編集指示はありません。"},
                {"role": "assistant", "content": f"情報交換 {number + 1} を記録しました。"},
            ])
        memory.capture_history(filler, record_requests=False)
        memory.save()
        session = engine_adapter.AgentSession(core, server, workspace)
        session.bind_memory(session_id)
        history = session._engine.history_tail(0)
        dump(run_dir / "restored-history.json", history)
        constraint_retained = "test_*.pyは変更禁止" in "\n".join(
            str(item.get("content") or "") for item in history)
        summary["memory_restore"] = {
            "synthetic_exchanges": 35, "live_model_exchanges": 0,
            "restored_message_count": len(history), "original_constraint_retained": constraint_retained,
        }
        dump(run_dir / "summary.json", summary)
        if not constraint_retained:
            raise RuntimeError("original protected-test constraint was lost after checkpoint restore")

        (workspace / "test_discount.py").write_text(TEST_DISCOUNT, encoding="utf-8")
        baseline = independent_oracle(workspace)
        dump(run_dir / "stage2-failing-oracle.json", baseline)
        if baseline.get("exit_code") in (0, None):
            raise RuntimeError("the second-stage fixture did not fail independently")
        second_prompt = (
            "続けて合計関数 total(items, discount=0) に割引率 discount を追加してください。"
            "割引率は百分率です。10なら合計から10%を引き、省略時は今までの合計を維持します。"
            f"指定コマンドで検証してください: {command}\n"
            "必要な実装を行い、失敗したら修正して再実行し、結果を短く報告してください。"
        )
        second = evaluate_stage(session, second_prompt, command, run_dir, "stage2")
        summary["stages"].append(second)
        summary["passed"] = first["passed"] and second["passed"] and constraint_retained
        return 0 if summary["passed"] else 1
    except BaseException as exc:
        summary["error"] = f"{type(exc).__name__}: {exc}"
        print(summary["error"], flush=True)
        return 1
    finally:
        if session is not None:
            session.close()
        summary["duration_sec"] = round(time.monotonic() - started, 4)
        summary["finished_at"] = datetime.now(timezone.utc).isoformat()
        dump(run_dir / "summary.json", summary)
        print(f"FINISHED passed={summary['passed']} {run_dir}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8136/v1")
    parser.add_argument("--model", default="qwen3.6-35b-a3b")
    parser.add_argument("--output", help="new artifact directory (must not already exist)")
    sys.exit(run(parser.parse_args()))
