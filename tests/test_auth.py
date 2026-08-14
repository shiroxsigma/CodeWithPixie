from fastapi.testclient import TestClient

from app import auth, main


def test_local_mode_keeps_existing_access(monkeypatch):
    monkeypatch.setattr(main.settings, "host", "127.0.0.1")
    client = TestClient(main.app, base_url="http://127.0.0.1")
    assert client.get("/api/status").status_code != 404


def test_lan_mode_requires_token_and_sets_cookie(monkeypatch):
    lan_host = "192.0.2.10"
    monkeypatch.setattr(main.settings, "host", lan_host)
    monkeypatch.setattr(main, "ALLOWED_HOSTS", {"127.0.0.1", "localhost", lan_host})
    client = TestClient(main.app, base_url=f"http://{lan_host}")
    assert client.get("/").status_code == 404
    assert client.get("/healthz").status_code == 200
    response = client.get(f"/?t={auth.TOKEN}")
    assert response.status_code == 200
    assert auth.COOKIE in response.cookies
    assert client.get("/api/status").status_code != 404
