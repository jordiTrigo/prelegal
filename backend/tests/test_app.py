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


def test_app_route_redirects_when_signed_out(client: TestClient) -> None:
    response = client.get("/app", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/"


def test_documents_route_redirects_when_signed_out(client: TestClient) -> None:
    response = client.get("/documents", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/"


def test_app_route_serves_tool_page_when_signed_in(signed_up_client: TestClient) -> None:
    response = signed_up_client.get("/app")
    assert response.status_code == 200
    assert "nda tool" in response.text


def test_documents_route_serves_page_when_signed_in(signed_up_client: TestClient) -> None:
    response = signed_up_client.get("/documents")
    assert response.status_code == 200
    assert "my documents" in response.text


def test_signup_route_is_not_gated(client: TestClient) -> None:
    response = client.get("/signup")
    assert response.status_code == 200
    assert "sign up" in response.text


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
