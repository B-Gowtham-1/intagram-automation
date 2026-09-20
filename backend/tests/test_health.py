from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_check_returns_200_and_status_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "app" in data
    assert "version" in data


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    if "application/json" in response.headers.get("content-type", ""):
        data = response.json()
        assert data["health"] == "/api/health"
    else:
        assert "<html" in response.text.lower()
