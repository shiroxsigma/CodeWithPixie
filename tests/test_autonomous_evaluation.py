"""Validate autonomous evaluation fixtures and product context without an LLM."""
import importlib.util
import json
from pathlib import Path
import threading
from types import SimpleNamespace

from app import note_prompts


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "evaluate_autonomous.py"
_spec = importlib.util.spec_from_file_location("autonomous_evaluation_under_test", SCRIPT)
evaluation = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(evaluation)


def test_fixture_requires_both_source_repairs_then_discount_without_test_changes(tmp_path):
    (tmp_path / "test_totals.py").write_text(evaluation.TEST_TOTALS, encoding="utf-8")
    (tmp_path / "math_ops.py").write_text("def subtotal(price, quantity):\n    return price\n", encoding="utf-8")
    (tmp_path / "checkout.py").write_text(
        "from math_ops import subtotal\ndef total(items):\n"
        "    return sum(subtotal(p, q) for p, q in items) + 5\n", encoding="utf-8")
    initial_tests = evaluation.protected_hashes(tmp_path)
    initial = evaluation.independent_oracle(tmp_path)
    assert initial["exit_code"] != 0 and initial["tests_run"] == 4

    (tmp_path / "math_ops.py").write_text("def subtotal(price, quantity):\n    return price * quantity\n", encoding="utf-8")
    partial = evaluation.independent_oracle(tmp_path)
    assert partial["exit_code"] != 0, "fixing only quantity must leave the extra-fee bug exposed"
    (tmp_path / "checkout.py").write_text(
        "from math_ops import subtotal\ndef total(items):\n"
        "    return sum(subtotal(p, q) for p, q in items)\n", encoding="utf-8")
    first = evaluation.independent_oracle(tmp_path)
    assert first["exit_code"] == 0 and first["tests_run"] == 4
    assert evaluation.protected_hashes(tmp_path) == initial_tests

    (tmp_path / "test_discount.py").write_text(evaluation.TEST_DISCOUNT, encoding="utf-8")
    all_tests = evaluation.protected_hashes(tmp_path)
    missing_discount = evaluation.independent_oracle(tmp_path)
    assert missing_discount["exit_code"] != 0 and missing_discount["tests_run"] == 8
    (tmp_path / "checkout.py").write_text(
        "from math_ops import subtotal\ndef total(items, discount=0):\n"
        "    return sum(subtotal(p, q) for p, q in items) * (1 - discount / 100)\n", encoding="utf-8")
    second = evaluation.independent_oracle(tmp_path)
    assert second["exit_code"] == 0 and second["tests_run"] == 8
    assert second["sources_before"] == second["sources_after"] == evaluation.source_hashes(tmp_path)
    assert evaluation.protected_hashes(tmp_path) == all_tests


def test_oracle_detects_source_mutation_even_when_unittest_passes(tmp_path):
    (tmp_path / "source.py").write_text("VALUE = 1\n", encoding="utf-8")
    (tmp_path / "test_mutation.py").write_text(
        "from pathlib import Path\nimport unittest\nfrom source import VALUE\n"
        "class TestMutation(unittest.TestCase):\n"
        "    def test_value(self):\n"
        "        self.assertEqual(VALUE, 1)\n"
        "        Path('source.py').write_text('VALUE = 2\\n', encoding='utf-8')\n", encoding="utf-8")
    result = evaluation.independent_oracle(tmp_path)
    assert result["exit_code"] == 0 and result["tests_run"] == 1
    assert result["sources_before"] != result["sources_after"]


def test_zero_test_run_is_reported_as_zero_executed_tests(tmp_path):
    (tmp_path / "test_empty.py").write_text("# no tests\n", encoding="utf-8")
    result = evaluation.independent_oracle(tmp_path)
    assert result["exit_code"] in {0, 5} and result["tests_run"] == 0


def test_live_stage_passes_product_workset_text_and_original_request_separately(tmp_path):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    memory_path = workspace / "checkpoint.json"
    memory_path.write_text(json.dumps({"commands": []}), encoding="utf-8")
    workset = {"items": [{"path": "checkout.py", "role": "selected", "lines": 4, "chars": 100}]}

    class Session:
        busy = threading.Lock()
        outcome = {"status": "completed"}
        _autonomous_run = SimpleNamespace(receipt={}, verified=lambda: False)
        _memory = SimpleNamespace(path=memory_path)

        def __init__(self):
            self.workspace = str(workspace)
            self.configured_request = None
            self.received_text = None

        def reserve_turn(self):
            return self.busy.acquire(blocking=False)

        def configure_autonomy(self, enabled, command, *, user_request):
            self.configured_request = user_request

        def set_workspace_snapshot(self, *args):
            pass

        def build_workset(self, *args):
            return workset

        def begin_turn(self, *args):
            return 1

        def prepare_turn_snapshot(self, *args):
            pass

        def run_turn(self, text, emit, **kwargs):
            self.received_text = text

        def end_turn(self):
            pass

        def release_turn(self):
            self.busy.release()

    session = Session()
    prompt = "test_*.pyは変更禁止。合計を修正してください。"
    result = evaluation.evaluate_stage(session, prompt, "python -m unittest -q", tmp_path, "context")
    expected = note_prompts.build_workset_user_text(prompt, "", workset, "checkout.py")
    assert session.received_text == expected
    assert "# Workset" in session.received_text
    assert session.configured_request == prompt
    assert not result["passed"], "a context-only stub must never count as a live verification success"
    assert not result["checks"]["actual_successful_command"]
