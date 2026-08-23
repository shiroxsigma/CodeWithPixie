"""pixie_coreの機能をバージョン番号ではなく公開面から検出する。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import engine_adapter, main  # noqa: E402


class _ModernEngine:
    def set_workspace_snapshot(self): pass
    def build_workset(self): pass
    def validate_changeset(self): pass
    def apply_changeset(self): pass
    def revert_changeset(self): pass
    def history_size(self): pass
    def history_tail(self): pass
    def history_drop(self): pass
    def history_replace(self): pass
    def set_stream_timeout(self): pass
    def set_context_policy(self): pass
    def run_turn_events(self): pass
    def get_turn_metrics(self): pass


class _ModernCore:
    API_VERSION = "2.0"
    Engine = _ModernEngine

    @staticmethod
    def create_engine(server, workspace, profile=None):
        pass


class _LegacyCore:
    API_VERSION = "1.4"

    class Engine:
        pass

    @staticmethod
    def create_engine(server, workspace):
        pass


def test_detects_capabilities_from_public_methods():
    capabilities = engine_adapter.detect_capabilities(_ModernCore)
    assert capabilities == {
        "api_version": "2.0",
        "workspace_snapshot": True,
        "workset": True,
        "changeset": True,
        "history": True,
        "stream_timeout": True,
        "context_policy": True,
        "structured_events": True,
        "turn_metrics": True,
        "agent_profiles": True,
    }


def test_does_not_infer_features_from_version_number():
    capabilities = engine_adapter.detect_capabilities(_LegacyCore)
    assert capabilities["api_version"] == "1.4"
    assert not any(value for key, value in capabilities.items() if key != "api_version")


def test_status_exposes_engine_capabilities(monkeypatch):
    class Manager:
        def count(self): return 0

    monkeypatch.setattr(main, "_manager", Manager())
    monkeypatch.setattr(engine_adapter, "_capabilities", {"workset": True, "changeset": True})
    response = TestClient(main.app, base_url="http://127.0.0.1").get("/api/status")
    assert response.status_code == 200
    assert response.json()["capabilities"] == {"workset": True, "changeset": True}


def test_public_context_policy_is_preferred_over_private_backend():
    class Engine:
        def __init__(self):
            self.policies = []

        def set_context_policy(self, policy):
            self.policies.append(policy)

        @property
        def context(self):
            raise AssertionError("公開setterがあればprivate backendへ触れてはいけない")

    engine = Engine()
    engine_adapter._apply_context_length(engine, {"context_length": 65536})
    assert engine.policies == [{"context_length": 65536}]
