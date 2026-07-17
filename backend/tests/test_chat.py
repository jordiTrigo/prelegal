"""Integration tests for the AI chat endpoint (classification + field collection)."""

import json

import pytest
from fastapi.testclient import TestClient

import app.chat as chat_module


class FakeMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class FakeChoice:
    def __init__(self, content: str) -> None:
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content: str) -> None:
        self.choices = [FakeChoice(content)]


def fake_completion(content: dict):
    def _completion(**kwargs) -> FakeResponse:
        return FakeResponse(json.dumps(content))

    return _completion


def fake_completion_sequence(contents: list[str]):
    """Returns each raw string in order across successive calls."""
    remaining = iter(contents)

    def _completion(**kwargs) -> FakeResponse:
        return FakeResponse(next(remaining))

    return _completion


# --- _call_llm retry/repair ---------------------------------------------------


def test_call_llm_retries_once_after_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion_sequence(
            ["Sure, let's talk!", json.dumps({"reply": "Got it", "fields": {}})]
        ),
    )

    result = chat_module._call_llm("system", [chat_module.ChatMessage(role="user", content="hi")])

    assert result == {"reply": "Got it", "fields": {}}


def test_call_llm_raises_after_repeated_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion_sequence(["not json", "still not json"]),
    )

    with pytest.raises(chat_module.LLMOutputError):
        chat_module._call_llm("system", [chat_module.ChatMessage(role="user", content="hi")])


# --- classification turn (documentType unset) --------------------------------


def test_chat_endpoint_resolves_document_type(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {
                "reply": "Great, let's put together a Data Processing Agreement.",
                "documentType": "dpa",
            }
        ),
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "I need a DPA"}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "dpa"


def test_chat_endpoint_ignores_hallucinated_document_type(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion({"reply": "Let's get started.", "documentType": "not-a-real-type"}),
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )

    assert response.status_code == 200
    assert response.json().get("documentType") is None


def test_chat_endpoint_explains_unsupported_document(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {
                "reply": "We can't generate an Employment Agreement, but a Design "
                "Partner Agreement might be close - want to try that instead?",
                "documentType": None,
            }
        ),
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "I need an employment agreement"}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body.get("documentType") is None
    assert "Design Partner Agreement" in body["reply"]


# --- field-collection turn (documentType set) ---------------------------------


def test_chat_endpoint_returns_reply_and_extracted_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {
                "reply": "Got it, thanks! What's the duration of processing?",
                "fields": {"customer": {"companyName": "Acme Inc"}},
            }
        ),
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "We are Acme Inc"}],
            "documentType": "dpa",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "dpa"
    assert body["fields"]["customer"]["companyName"] == "Acme Inc"


def test_chat_endpoint_merges_with_prior_known_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {
                "reply": "And who signs for them?",
                "fields": {"customer": {"signerName": "Jane Doe"}},
            }
        ),
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Jane Doe will sign"}],
            "documentType": "dpa",
            "fields": {"customer": {"companyName": "Acme Inc"}},
        },
    )

    assert response.status_code == 200
    customer = response.json()["fields"]["customer"]
    assert customer["companyName"] == "Acme Inc"
    assert customer["signerName"] == "Jane Doe"


def test_chat_endpoint_drops_invalid_extracted_field(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion({"reply": "Noted.", "fields": {"mndaTermYears": 500}}),
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "500 years"}], "documentType": "mutual-nda"},
    )

    assert response.status_code == 200
    assert "mndaTermYears" not in response.json()["fields"]


def test_chat_endpoint_appends_followup_question_when_fields_missing(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {"reply": "Thanks for that.", "fields": {"customer": {"companyName": "Acme Inc"}}}
        ),
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "We are Acme Inc"}], "documentType": "dpa"},
    )

    assert response.status_code == 200
    assert "?" in response.json()["reply"]


def test_chat_endpoint_falls_back_when_reply_is_blank(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module, "completion", fake_completion({"reply": "  ", "fields": {}})
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "documentType": "mutual-nda"},
    )

    assert response.status_code == 200
    assert "Sorry, could you rephrase that?" in response.json()["reply"]


def test_chat_endpoint_replies_gracefully_when_model_never_returns_json(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion_sequence(["not json", "still not json"]),
    )

    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "hi"}]})

    assert response.status_code == 200
    assert response.json()["reply"] == "Sorry, could you rephrase that?"


def test_chat_endpoint_returns_502_on_llm_failure(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _raise(**kwargs):
        raise RuntimeError("upstream error")

    monkeypatch.setattr(chat_module, "completion", _raise)

    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "hi"}]})

    assert response.status_code == 502
