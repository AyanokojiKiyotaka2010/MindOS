from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint_returns_welcome_message() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to MINDOS API"


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["application"] == "MINDOS API"
    assert payload["version"] == "0.1.0"
