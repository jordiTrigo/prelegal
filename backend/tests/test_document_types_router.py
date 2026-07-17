"""Tests for GET /api/document-types/{doc_type}."""

from fastapi.testclient import TestClient


def test_get_document_type_template_returns_markdown(client: TestClient) -> None:
    response = client.get("/api/document-types/dpa")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "dpa"
    assert "coverpage_link" in body["templateMarkdown"] or "keyterms_link" in body["templateMarkdown"]


def test_get_document_type_template_serves_nda_standard_terms(client: TestClient) -> None:
    """NDA's registry lists coverpage then standard-terms; the standard-terms
    file (which has the substitution spans) must be served, not the coverpage."""
    response = client.get("/api/document-types/mutual-nda")
    assert response.status_code == 200
    assert 'class="coverpage_link"' in response.json()["templateMarkdown"]


def test_get_document_type_template_404s_for_unknown_type(client: TestClient) -> None:
    response = client.get("/api/document-types/not-a-real-type")
    assert response.status_code == 404
