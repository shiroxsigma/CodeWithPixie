"""Exercise evaluation receipts with real pytest subprocesses, without an LLM."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time

import pytest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
_spec = importlib.util.spec_from_file_location("cwp_evaluation_under_test", SCRIPTS / "evaluate_cwp.py")
evaluation = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(evaluation)


@pytest.fixture
def project(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    (workspace / "solution.py").write_text("VALUE = 2\n", encoding="utf-8")
    (workspace / "test_solution.py").write_text(
        "import os\nfrom solution import VALUE\n"
        "def test_value():\n"
        "    assert VALUE == 2\n"
        "    assert os.environ.get('CWP_FORCE_TEST_FAILURE') != '1'\n",
        encoding="utf-8",
    )
    receipts = tmp_path / "receipts"
    started_at = time.time()

    def execute(*, fail=False):
        env = {
            **os.environ,
            "PYTHONPATH": str(SCRIPTS),
            "PYTEST_PLUGINS": "cwp_eval_observer",
            "PYTEST_DISABLE_PLUGIN_AUTOLOAD": "1",
            "PYTEST_ADDOPTS": "",
            "CWP_EVAL_RECEIPTS": str(receipts),
            "CWP_FORCE_TEST_FAILURE": "1" if fail else "0",
        }
        return subprocess.run(
            [sys.executable, "-m", "pytest", "-q", "--junitxml=.cwp-create.xml"],
            cwd=workspace, env=env, capture_output=True, text=True, timeout=30,
        )

    return workspace, receipts, started_at, execute


def test_real_pytest_success_emits_fresh_receipt_for_final_sources(project):
    workspace, receipts, started_at, execute = project
    result = execute()
    assert result.returncode == 0, result.stdout + result.stderr
    reports = list(receipts.glob("*.json"))
    assert len(reports) == 1
    receipt = json.loads(reports[0].read_text(encoding="utf-8"))
    assert receipt["cwd"] == str(workspace.resolve())
    assert receipt["started_at"] >= started_at
    assert receipt["finished_at"] >= receipt["started_at"]
    assert receipt["collected"] == receipt["passed"] == 1
    assert receipt["exitstatus"] == receipt["failed"] == 0
    assert receipt["source_before"] == receipt["source_after"] == evaluation.hashes(workspace)
    passed, count, ids = evaluation.test_evidence(receipts, workspace, "create", started_at)
    assert passed and count == 1 and ids == [receipt["id"]]


def test_old_receipt_and_other_phase_cannot_verify_current_turn(project):
    workspace, receipts, started_at, execute = project
    assert execute().returncode == 0
    receipt = json.loads(next(receipts.glob("*.json")).read_text(encoding="utf-8"))
    assert not evaluation.test_evidence(receipts, workspace, "create", receipt["finished_at"] + 1)[0]
    assert not evaluation.test_evidence(receipts, workspace, "edit", started_at)[0]
    assert not evaluation.test_evidence(receipts, workspace.parent, "create", started_at)[0]


def test_edit_after_successful_pytest_invalidates_receipt(project):
    workspace, receipts, started_at, execute = project
    assert execute().returncode == 0
    (workspace / "solution.py").write_text("VALUE = 3\n", encoding="utf-8")
    assert not evaluation.test_evidence(receipts, workspace, "create", started_at)[0]


def test_latest_failed_pytest_invalidates_older_success_even_with_same_hashes(project):
    workspace, receipts, started_at, execute = project
    assert execute().returncode == 0
    assert evaluation.test_evidence(receipts, workspace, "create", started_at)[0]
    assert execute(fail=True).returncode == 1
    passed, count, ids = evaluation.test_evidence(receipts, workspace, "create", started_at)
    assert not passed and count == 0 and len(ids) == 2


def test_aborted_pytest_does_not_fall_back_to_older_success(project):
    workspace, receipts, started_at, execute = project
    (workspace / "test_solution.py").write_text(
        "import os\nfrom solution import VALUE\n"
        "def test_value():\n"
        "    if os.environ.get('CWP_FORCE_TEST_FAILURE') == '1':\n"
        "        os._exit(17)\n"
        "    assert VALUE == 2\n",
        encoding="utf-8",
    )
    source_hashes = evaluation.hashes(workspace)
    assert execute().returncode == 0
    assert evaluation.test_evidence(receipts, workspace, "create", started_at)[0]
    assert execute(fail=True).returncode == 17
    assert evaluation.hashes(workspace) == source_hashes
    reports = sorted(
        (json.loads(path.read_text(encoding="utf-8")) for path in receipts.glob("*.json")),
        key=lambda receipt: receipt["started_at"],
    )
    assert len(reports) == 2
    assert reports[0]["exitstatus"] == 0
    assert "finished_at" not in reports[-1]
    passed, count, ids = evaluation.test_evidence(receipts, workspace, "create", started_at)
    assert not passed and count == 0 and len(ids) == 2


def test_mutation_during_passing_pytest_does_not_verify_final_sources(project):
    workspace, receipts, started_at, execute = project
    (workspace / "test_solution.py").write_text(
        "from pathlib import Path\nfrom solution import VALUE\n"
        "def test_value():\n"
        "    assert VALUE == 2\n"
        "    Path('solution.py').write_text('VALUE = 3\\n', encoding='utf-8')\n",
        encoding="utf-8",
    )
    assert execute().returncode == 0
    assert not evaluation.test_evidence(receipts, workspace, "create", started_at)[0]


@pytest.mark.parametrize("test_source", [
    "import pytest\n@pytest.mark.skip(reason='not executed')\ndef test_value(): pass\n",
    "# No tests collected\n",
])
def test_zero_executed_tests_do_not_verify_project(project, test_source):
    workspace, receipts, started_at, execute = project
    (workspace / "test_solution.py").write_text(test_source, encoding="utf-8")
    result = execute()
    assert result.returncode in {0, 5}
    passed, count, _ = evaluation.test_evidence(receipts, workspace, "create", started_at)
    assert not passed and count == 0


@pytest.mark.parametrize(("lines", "expected"), [(0, False), (59, True), (60, False)])
def test_scope_requires_nonempty_files_strictly_under_sixty_lines(tmp_path, lines, expected):
    case = evaluation.CASES[0]
    (tmp_path / "totals.py").write_text("VALUE = 1\n", encoding="utf-8")
    (tmp_path / "test_totals.py").write_text("# test line\n" * lines, encoding="utf-8")
    passed, counts = evaluation.scope_evidence(tmp_path, case)
    assert passed is expected
    assert counts == {"totals.py": 1, "test_totals.py": lines}


@pytest.mark.parametrize("violation", ["extra", "missing"])
def test_scope_rejects_extra_or_missing_python_files(tmp_path, violation):
    (tmp_path / "totals.py").write_text("VALUE = 1\n", encoding="utf-8")
    if violation == "extra":
        (tmp_path / "test_totals.py").write_text("def test_value(): pass\n", encoding="utf-8")
        (tmp_path / "extra.py").write_text("EXTRA = 1\n", encoding="utf-8")
    passed, _ = evaluation.scope_evidence(tmp_path, evaluation.CASES[0])
    assert not passed


@pytest.mark.parametrize(("raw_passed", "edit_lines", "expected_passed"), [
    (True, 59, True), (True, 60, False), (False, 59, False),
])
def test_artifact_audit_preserves_raw_results_and_never_promotes_failure(
    tmp_path, raw_passed, edit_lines, expected_passed,
):
    case = evaluation.CASES[0]
    raw = [{"case": "totals", "phase": phase, "passed": raw_passed, "metrics": {"tool_calls": 3}}
           for phase in ("create", "edit")]
    raw_path = tmp_path / "results.json"
    raw_path.write_text(json.dumps(raw, indent=4) + "\n", encoding="utf-8")
    original_bytes = raw_path.read_bytes()
    (tmp_path / "manifest.json").write_text(json.dumps({"cases": [case]}), encoding="utf-8")
    for phase in ("create", "edit"):
        folder = tmp_path / "artifacts" / "totals" / phase
        folder.mkdir(parents=True)
        (folder / "totals.py").write_text("VALUE = 1\n", encoding="utf-8")
        (folder / "test_totals.py").write_text(
            "# test line\n" * (edit_lines if phase == "edit" else 59), encoding="utf-8"
        )
    assert evaluation.audit_results(tmp_path) == (0 if expected_passed else 1)
    assert raw_path.read_bytes() == original_bytes
    audited = json.loads((tmp_path / "audited-results.json").read_text(encoding="utf-8"))
    assert audited[0]["passed"] is raw_passed
    assert audited[1]["passed"] is expected_passed
    assert audited[1]["raw_passed"] is raw_passed
    assert audited[1]["source_line_counts"]["test_totals.py"] == edit_lines
    assert audited[1]["metrics"] == raw[1]["metrics"]
