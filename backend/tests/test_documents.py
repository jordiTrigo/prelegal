"""Tests for saving and listing a signed-in user's documents."""

from fastapi.testclient import TestClient


def test_save_document_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "Testing"}}
    )
    assert response.status_code == 401


def test_list_documents_requires_auth(client: TestClient) -> None:
    response = client.get("/api/documents")
    assert response.status_code == 401


def test_save_document_returns_saved_record(signed_up_client: TestClient) -> None:
    response = signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "Testing"}}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "mutual-nda"
    assert body["fields"] == {"purpose": "Testing"}
    assert "id" in body
    assert "createdAt" in body


def test_list_documents_returns_only_the_current_users_documents(
    signed_up_client: TestClient,
) -> None:
    signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "First"}}
    )
    other_client = signed_up_client
    other_client.post("/api/auth/signout")
    other_client.post("/api/auth/signup", json={"email": "other@example.com", "password": "correct-horse"})
    other_client.post(
        "/api/documents", json={"documentType": "dpa", "fields": {"durationOfProcessing": "1 year"}}
    )

    response = other_client.get("/api/documents")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["documentType"] == "dpa"


def test_save_document_is_idempotent_for_unchanged_fields(signed_up_client: TestClient) -> None:
    first = signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "Testing"}}
    )
    second = signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "Testing"}}
    )

    assert first.json()["id"] == second.json()["id"]
    assert len(signed_up_client.get("/api/documents").json()) == 1


def test_save_document_creates_a_new_row_when_fields_change(signed_up_client: TestClient) -> None:
    signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "First draft"}}
    )
    signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "Revised draft"}}
    )

    assert len(signed_up_client.get("/api/documents").json()) == 2


def test_save_document_with_id_updates_the_existing_row(signed_up_client: TestClient) -> None:
    created = signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "First draft"}}
    ).json()

    updated = signed_up_client.post(
        "/api/documents",
        json={
            "documentType": "mutual-nda",
            "fields": {"purpose": "Edited draft"},
            "documentId": created["id"],
        },
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["id"] == created["id"]
    assert body["fields"] == {"purpose": "Edited draft"}

    all_documents = signed_up_client.get("/api/documents").json()
    assert len(all_documents) == 1
    assert all_documents[0]["fields"] == {"purpose": "Edited draft"}


def test_save_document_with_id_rejects_another_users_document(
    signed_up_client: TestClient,
) -> None:
    created = signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "Mine"}}
    ).json()

    signed_up_client.post("/api/auth/signout")
    signed_up_client.post(
        "/api/auth/signup", json={"email": "intruder@example.com", "password": "correct-horse"}
    )
    response = signed_up_client.post(
        "/api/documents",
        json={
            "documentType": "mutual-nda",
            "fields": {"purpose": "Hijacked"},
            "documentId": created["id"],
        },
    )

    assert response.status_code == 404


def test_list_documents_orders_most_recent_first(signed_up_client: TestClient) -> None:
    signed_up_client.post(
        "/api/documents", json={"documentType": "mutual-nda", "fields": {"purpose": "First"}}
    )
    signed_up_client.post(
        "/api/documents", json={"documentType": "dpa", "fields": {"durationOfProcessing": "1 year"}}
    )

    response = signed_up_client.get("/api/documents")
    body = response.json()
    assert [doc["documentType"] for doc in body] == ["dpa", "mutual-nda"]
