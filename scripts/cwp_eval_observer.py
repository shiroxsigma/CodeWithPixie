"""Pytest execution receipts for evaluate_cwp; never imported by the product."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import sys
import time
import uuid


def source_hashes(folder):
    return {p.relative_to(folder).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(folder.rglob("*.py")) if "__pycache__" not in p.parts}


def save_receipt(receipt):
    folder = Path(os.environ["CWP_EVAL_RECEIPTS"])
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / (receipt["id"] + ".json")
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def pytest_sessionstart(session):
    session._cwp_eval_receipt = {
        "id": uuid.uuid4().hex,
        "cwd": str(Path.cwd().resolve()),
        "argv": sys.argv,
        "started_at": time.time(),
        "source_before": source_hashes(Path.cwd()),
    }
    save_receipt(session._cwp_eval_receipt)


def pytest_sessionfinish(session, exitstatus):
    receipt = session._cwp_eval_receipt
    reporter = session.config.pluginmanager.getplugin("terminalreporter")
    receipt.update({
        "finished_at": time.time(),
        "exitstatus": int(exitstatus),
        "collected": session.testscollected,
        "failed": session.testsfailed,
        "passed": len(reporter.stats.get("passed", [])) if reporter else 0,
        "source_after": source_hashes(Path.cwd()),
    })
    save_receipt(receipt)
