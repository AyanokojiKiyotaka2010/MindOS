from fastapi.testclient import TestClient

from app.main import app
from app.core.config import get_settings

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
    settings = get_settings()
    assert payload["application"] == settings.app_name
    assert payload["version"] == settings.app_version
