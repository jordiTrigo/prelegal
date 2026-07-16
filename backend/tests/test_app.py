"""Integration tests: full app via TestClient with a fake frontend export."""

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_serves_login_page(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "login" in response.text


def test_app_route_serves_tool_page(client: TestClient) -> None:
    response = client.get("/app")
    assert response.status_code == 200
    assert "nda tool" in response.text


def test_static_asset(client: TestClient) -> None:
    response = client.get("/_next/static/chunk.js")
    assert response.status_code == 200
    assert "chunk" in response.text


def test_unknown_route_is_404(client: TestClient) -> None:
    response = client.get("/no-such-page")
    assert response.status_code == 404
    assert "not found" in response.text


def test_unknown_api_route_hits_api_not_frontend(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.headers["content-type"].startswith("application/json")


def test_db_created_on_startup(client: TestClient) -> None:
    from app.settings import settings

    assert settings.db_path.exists()
