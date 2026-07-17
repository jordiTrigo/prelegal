"""Tests for sign up, sign in, sign out, and session lookup."""

from fastapi.testclient import TestClient

from app.auth import hash_password, verify_password


def test_hash_password_round_trips() -> None:
    hashed = hash_password("correct-horse")
    assert verify_password("correct-horse", hashed)


def test_verify_password_rejects_wrong_password() -> None:
    hashed = hash_password("correct-horse")
    assert not verify_password("wrong-password", hashed)


def test_hash_password_uses_a_fresh_salt_each_time() -> None:
    assert hash_password("correct-horse") != hash_password("correct-horse")


def test_signup_creates_account_and_sets_session_cookie(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup", json={"email": "jane@example.com", "password": "correct-horse"}
    )
    assert response.status_code == 200
    assert response.json() == {"email": "jane@example.com"}
    assert "session_token" in response.cookies


def test_signup_rejects_duplicate_email(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "jane@example.com", "password": "correct-horse"})
    response = client.post(
        "/api/auth/signup", json={"email": "jane@example.com", "password": "another-password"}
    )
    assert response.status_code == 409


def test_signup_rejects_short_password(client: TestClient) -> None:
    response = client.post("/api/auth/signup", json={"email": "jane@example.com", "password": "short"})
    assert response.status_code == 400


def test_signup_rejects_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup", json={"email": "not-an-email", "password": "correct-horse"}
    )
    assert response.status_code == 400


def test_signup_normalizes_email_case(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "Jane@Example.com", "password": "correct-horse"})
    response = client.post(
        "/api/auth/signin", json={"email": "jane@example.com", "password": "correct-horse"}
    )
    assert response.status_code == 200


def test_signin_with_correct_credentials(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "jane@example.com", "password": "correct-horse"})
    response = client.post(
        "/api/auth/signin", json={"email": "jane@example.com", "password": "correct-horse"}
    )
    assert response.status_code == 200
    assert response.json() == {"email": "jane@example.com"}


def test_signin_with_wrong_password(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "jane@example.com", "password": "correct-horse"})
    response = client.post(
        "/api/auth/signin", json={"email": "jane@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_signin_with_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signin", json={"email": "nobody@example.com", "password": "correct-horse"}
    )
    assert response.status_code == 401


def test_me_returns_current_user_when_signed_in(signed_up_client: TestClient) -> None:
    response = signed_up_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"email": "jane@example.com"}


def test_me_returns_401_when_signed_out(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_signout_clears_session(signed_up_client: TestClient) -> None:
    signout_response = signed_up_client.post("/api/auth/signout")
    assert signout_response.status_code == 200

    me_response = signed_up_client.get("/api/auth/me")
    assert me_response.status_code == 401
