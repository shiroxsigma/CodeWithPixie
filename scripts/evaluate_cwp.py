"""Run repeatable real-model create/edit evaluations through the CWP HTTP API.

Uses a frozen engine source copy and an isolated CWP config/workspace. All model
edits go through CWP approval; independent oracles stay outside its workspace.
Run with the CWP virtualenv Python. Logs include model output and generated code.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    {"name": "totals", "module": "totals", "function": "summarize",
     "create": "Implement summarize(values), returning a dict with count and total for a list of numbers. Empty input gives count 0 and total 0. Do not mutate the input.",
     "edit": "Extend summarize(values) to also return mean, which is total/count, or None for empty input. Preserve count, total, and the input list.",
     "checks": [([], {"count": 0, "total": 0}), ([2, 3], {"count": 2, "total": 5}), ([-2, 2, 6], {"count": 3, "total": 6}), ([0.5, 1.5], {"count": 2, "total": 2.0})]},
    {"name": "text", "module": "textutils", "function": "clean_text",
     "create": "Implement clean_text(text), stripping leading/trailing whitespace and replacing each run of whitespace (including tabs and newlines) with one space. Preserve letter case. Whitespace-only input returns an empty string.",
     "edit": "Extend clean_text(text, lowercase=False) with an optional flag. When true, apply str.casefold to the cleaned text. Default behavior must remain unchanged.",
     "checks": [("  Hello\t WORLD\n ", "Hello WORLD"), ("\n\t", ""), ("A\u3000B", "A B"), ("Straße  X", "Straße X")]},
    {"name": "tags", "module": "tags", "function": "unique_tags",
     "create": "Implement unique_tags(values) for a list of strings. Strip each tag, discard empty tags, remove exact duplicates, preserve the first occurrence order and case, and do not mutate the input.",
     "edit": "Change unique_tags so duplicates are compared using str.casefold, while retaining the stripped spelling of the first occurrence. Preserve order and do not mutate input.",
     "checks": [([], []), ([" A ", "", "A", "b"], ["A", "b"]), ([" a", "A", " b ", "a"], ["a", "A", "b"]), (["Straße", "STRASSE", " x "], ["Straße", "STRASSE", "x"])]},
]


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def hashes(folder):
    return {p.relative_to(folder).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(folder.rglob("*.py")) if "__pycache__" not in p.parts}


def oracle(case, phase, workspace):
    spec = importlib.util.spec_from_file_location("subject", workspace / (case["module"] + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    function = getattr(module, case["function"])
    count = 0
    for value, expected in case["checks"]:
        original = value.copy() if isinstance(value, list) else value
        if phase == "edit" and case["name"] == "totals":
            expected = {**expected, "mean": expected["total"] / expected["count"] if expected["count"] else None}
        if phase == "edit" and case["name"] == "tags":
            seen = set()
            expected = []
            for tag in value:
                tag = tag.strip()
                if tag and tag.casefold() not in seen:
                    seen.add(tag.casefold())
                    expected.append(tag)
        actual = function(value)
        assert actual == expected, (value, actual, expected)
        assert value == original, "input was mutated"
        count += 1
        if phase == "edit" and case["name"] == "text":
            assert function(value, lowercase=True) == expected.casefold()
            count += 1
    print(json.dumps({"passed": count}))


def serve(config_path):
    sys.path.insert(0, str(config_path.parent))
    import uvicorn
    from app.main import app
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ["CWP_PORT"]), log_level="warning")


def test_evidence(receipt_dir, workspace, phase, started_at):
    """Require a real, fresh pytest execution over the final source contents."""
    final_hashes = hashes(workspace)
    receipts = []
    for path in receipt_dir.glob("*.json"):
        receipt = json.loads(path.read_text(encoding="utf-8"))
        if (Path(receipt["cwd"]) == workspace.resolve()
                and receipt["started_at"] >= started_at
                and f"--junitxml=.cwp-{phase}.xml" in receipt["argv"]):
            receipts.append(receipt)
    receipts.sort(key=lambda r: r["started_at"])
    latest = receipts[-1] if receipts else {}
    passed = bool(latest and latest.get("finished_at") and latest.get("exitstatus") == 0 and latest["passed"] > 0
                  and latest["failed"] == 0
                  and latest["source_before"] == latest["source_after"] == final_hashes)
    return passed, latest.get("passed", 0), [r["id"] for r in receipts]


def scope_evidence(workspace, case):
    counts = {p.name: len(p.read_text(encoding="utf-8-sig").splitlines())
              for p in workspace.glob("*.py")}
    expected = {case["module"] + ".py", "test_" + case["module"] + ".py"}
    return counts.keys() == expected and all(0 < count < 60 for count in counts.values()), counts


def audit_results(run_dir):
    """Apply current scope checks to saved phase artifacts; preserve raw results."""
    results = json.loads((run_dir / "results.json").read_text(encoding="utf-8"))
    manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    for result in results:
        case = next(c for c in CASES if c["name"] == result["case"])
        scope_ok, counts = scope_evidence(run_dir / "artifacts" / case["name"] / result["phase"], case)
        result.update(raw_passed=result["passed"], passed=result["passed"] and scope_ok,
                      scope_constraints_passed=scope_ok, source_line_counts=counts)
    dump(run_dir / "audited-results.json", results)
    print(json.dumps([{k: r[k] for k in ("case", "phase", "passed", "raw_passed", "source_line_counts")} for r in results], indent=2))
    return 0 if len(results) == len(manifest["cases"]) * 2 and all(r["passed"] for r in results) else 1


def evaluate_phase(case, phase, workspace, run_dir, post):
    command = f"python -m pytest -q --junitxml=.cwp-{phase}.xml"
    prompt = (f"{'Create a small Python project' if phase == 'create' else 'Edit this existing project'} in the current workspace. "
              + case[phase] + f" Use {case['module']}.py and test_{case['module']}.py only. "
              + f"{'Create' if phase == 'create' else 'Update'} meaningful pytest tests. Keep each file under 60 lines. "
              + f"Run exactly `{command}` in the workspace, fix any failing tests, and finish with a brief final answer. "
              + "Python and pytest are already installed. Do not install packages or create documentation.")
    (run_dir / f"{case['name']}-{phase}-prompt.txt").write_text(prompt, encoding="utf-8")
    started_at, phase_start = time.time(), time.monotonic()
    events, approvals = [], []
    failure = ""
    sid = "eval-" + case["name"]
    log_path = run_dir / f"{case['name']}-{phase}.jsonl"
    try:
        with post("/api/chat", {"session_id": sid, "message": prompt}) as response, log_path.open("w", encoding="utf-8") as log:
            for raw in response:
                line = raw.decode("utf-8").strip()
                if not line.startswith("data: "):
                    continue
                event = json.loads(line[6:])
                events.append(event)
                log.write(json.dumps(event, ensure_ascii=False) + "\n")
                log.flush()
                if event.get("type") == "approval":
                    allowed = True
                    for call in event["calls"]:
                        kw = call["args"]
                        if call["name"] == "run_command":
                            allowed &= (kw.get("command", "").strip() == command
                                        and Path(kw.get("working_directory") or workspace).resolve() == workspace.resolve())
                        elif call["name"] in {"write_file", "search_and_replace", "replace_lines", "append_to_file"}:
                            target = (workspace / kw.get("path", "")).resolve()
                            allowed &= (target.parent == workspace.resolve()
                                        and target.name in {case["module"] + ".py", "test_" + case["module"] + ".py"})
                        else:
                            allowed = False
                    approvals.append({"allowed": allowed, "tools": [c["name"] for c in event["calls"]]})
                    with post("/api/approve", {"session_id": sid, "id": event["id"], "approve": allowed}):
                        pass
                if event.get("type") in {"approval", "done", "error"} or (event.get("type") == "status" and event.get("category") != "phase"):
                    print(case["name"], phase, json.dumps({k: event.get(k) for k in ("type", "text", "status", "reason")}, ensure_ascii=True)[:500], flush=True)
    except Exception as exc:
        failure = f"{type(exc).__name__}: {exc}"
        # A broken transport must not leave an agent running during the next case.
        try:
            with post("/api/interrupt", {"session_id": sid}) as response:
                if not json.load(response).get("stopped"):
                    failure += "; cancellation still pending"
        except Exception:
            pass
    terminal = next((e for e in reversed(events) if e.get("type") == "done"), {})
    metrics = next((e.get("metrics") or {} for e in reversed(events) if e.get("type") == "turn_metrics"), {})
    reason = str(metrics.get("exit_reason") or terminal.get("reason") or "")
    try:
        independent = subprocess.run([sys.executable, "-X", "utf8", str(run_dir / "evaluate_cwp.py"), "--oracle", case["name"], phase, str(workspace)],
                                     capture_output=True, text=True, encoding="utf-8", timeout=30)
        oracle_ok = independent.returncode == 0
        oracle_output = independent.stdout + independent.stderr
    except subprocess.TimeoutExpired:
        oracle_ok, oracle_output = False, "Independent checks timed out after 30 seconds.\n"
    (run_dir / f"{case['name']}-{phase}-oracle.txt").write_text(oracle_output, encoding="utf-8")
    try:
        suite_ok, test_count, receipts = test_evidence(run_dir / "receipts", workspace, phase, started_at)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        suite_ok, test_count, receipts = False, 0, []
        failure += f"; invalid pytest evidence: {exc}"
    reason_code = reason.split(maxsplit=1)[0] if reason else ""
    normal = terminal.get("status") == "completed" and reason_code in {"final_answer", "final_answer_simple_direct"}
    try:
        scope_ok, line_counts = scope_evidence(workspace, case)
    except (OSError, UnicodeError) as exc:
        scope_ok, line_counts = False, {}
        failure += f"; invalid source files: {exc}"
    passed = normal and suite_ok and oracle_ok and scope_ok and all(a["allowed"] for a in approvals) and not failure
    result = {"case": case["name"], "phase": phase, "passed": bool(passed), "elapsed_sec": round(time.monotonic() - phase_start, 2),
              "terminal": terminal, "exit_reason": reason, "agent_tests_passed_after_last_edit": suite_ok, "agent_test_count": test_count,
              "external_tests_passed": oracle_ok, "approvals": approvals, "metrics": metrics,
              "test_receipts": receipts, "error": failure, "final_source_hashes": hashes(workspace)}
    result.update(scope_constraints_passed=scope_ok, source_line_counts=line_counts)
    artifact_dir = run_dir / "artifacts" / case["name"] / phase
    artifact_dir.mkdir(parents=True)
    for path in workspace.glob("*.py"):
        shutil.copy2(path, artifact_dir / path.name)
    print("RESULT " + json.dumps({k: result[k] for k in ("case", "phase", "passed", "elapsed_sec", "exit_reason", "agent_tests_passed_after_last_edit", "external_tests_passed")}), flush=True)
    return result


def run(args):
    # Refuse an occupied port before sending any requests to a different CWP.
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", args.port))
    sys.path.insert(0, str(ROOT))
    from app import config as app_config
    settings = app_config.settings
    run_dir = ROOT / "logs" / ("model-eval-" + time.strftime("%Y%m%d-%H%M%S"))
    run_dir.mkdir(parents=True)
    # Prevent generated projects from inheriting the product's pytest settings.
    (run_dir / "pytest.ini").write_text("[pytest]\n", encoding="utf-8")
    core_src = app_config.AWP_SRC
    snapshot = run_dir / "engine" / "src"
    shutil.copytree(core_src, snapshot, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    app_snapshot = run_dir / "cwp"
    shutil.copytree(ROOT / "app", app_snapshot / "app", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    (app_snapshot / "static").mkdir()  # HTTP API evaluation does not serve UI assets.
    shutil.copy2(__file__, run_dir / "evaluate_cwp.py")
    shutil.copy2(ROOT / "scripts/cwp_eval_observer.py", run_dir / "cwp_eval_observer.py")
    server = app_config.active_server()
    effective = {**settings.model_dump(), "awp_src": str(snapshot), "workspace_root": str(run_dir / "initial"),
                 "port": args.port, "host": "127.0.0.1", "turn_timeout_sec": args.timeout,
                 "servers": [server], "active_server": 0}
    runtime_config = app_snapshot / "config.json"
    dump(runtime_config, effective)
    manifest = {"engine_revision": subprocess.check_output(["git", "-C", str(core_src.parent), "rev-parse", "HEAD"], text=True).strip(),
                "cwp_revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                "engine_source_hashes": hashes(snapshot), "cwp_source_hashes": hashes(app_snapshot / "app"),
                "harness_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "observer_sha256": hashlib.sha256((run_dir / "cwp_eval_observer.py").read_bytes()).hexdigest(),
                "python": sys.version, "platform": sys.platform,
                "server": {k: server.get(k) for k in ("name", "base_url", "model", "context_length", "overall_timeout", "read_idle_timeout")},
                "think_budget_sec": effective["think_budget_sec"], "turn_timeout_sec": args.timeout,
                "turn_max_llm_calls": effective["turn_max_llm_calls"], "turn_max_tool_calls": effective["turn_max_tool_calls"],
                "cases": CASES[:args.cases], "engine_source": "frozen working tree, including pre-existing uncommitted changes"}
    dump(run_dir / "manifest.json", manifest)
    env = {**{k: v for k, v in os.environ.items() if not k.startswith("CWP_")},
           "CWP_PORT": str(args.port), "CWP_EVAL_RECEIPTS": str(run_dir / "receipts"),
           "PYTEST_PLUGINS": "cwp_eval_observer", "PYTHONPATH": str(run_dir),
           "PATH": str(Path(sys.executable).parent) + os.pathsep + os.environ["PATH"], "PYTHONUTF8": "1"}
    base = f"http://127.0.0.1:{args.port}"

    def post(path, body):
        return urllib.request.urlopen(urllib.request.Request(base + path,
            data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}), timeout=args.timeout + 30)

    results = []
    with (run_dir / "server.log").open("w", encoding="utf-8") as output:
        process = subprocess.Popen([sys.executable, str(run_dir / "evaluate_cwp.py"), "--serve", str(runtime_config)],
            cwd=app_snapshot, env=env, stdout=output, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError("evaluation CWP exited; see server.log")
                try:
                    with urllib.request.urlopen(base + "/api/status", timeout=2) as response:
                        status = json.load(response)
                        assert status["ready"]
                    break
                except Exception:
                    time.sleep(0.2)
            else:
                raise RuntimeError("evaluation CWP startup timed out")
            dump(run_dir / "initial-status.json", status)
            print("RUN_DIR=" + str(run_dir), flush=True)
            for case in CASES[:args.cases]:
                workspace = run_dir / case["name"]
                with post("/api/workspace", {"path": str(workspace)}):
                    pass
                for phase in ("create", "edit"):
                    result = evaluate_phase(case, phase, workspace, run_dir, post)
                    results.append(result)
                    dump(run_dir / "results.json", results)
                    if not result["passed"]:
                        break
                if results[-1]["error"]:
                    break  # Stop the server before proceeding after a broken transport.
        finally:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
    print("FINISHED " + str(run_dir), flush=True)
    return 0 if len(results) == args.cases * 2 and all(r["passed"] for r in results) else 1


if __name__ == "__main__":
    if "--serve" in sys.argv:
        serve(Path(sys.argv[2]))
    elif "--oracle" in sys.argv:
        oracle(next(c for c in CASES if c["name"] == sys.argv[2]), sys.argv[3], Path(sys.argv[4]))
    elif "--audit" in sys.argv:
        sys.exit(audit_results(Path(sys.argv[2]).resolve()))
    else:
        parser = argparse.ArgumentParser()
        parser.add_argument("--port", type=int, default=8782)
        parser.add_argument("--cases", type=int, choices=(1, 2, 3), default=3)
        parser.add_argument("--timeout", type=int, default=600)
        sys.exit(run(parser.parse_args()))
