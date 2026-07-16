"""Unit and integration tests for the AI chat endpoint."""

import json

import pytest
from fastapi.testclient import TestClient

import app.chat as chat_module
from app.chat import LLMOutputError, NdaFields, merge_fields, validate_extracted_fields


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


# --- validate_extracted_fields ---------------------------------------------


def test_validate_extracted_fields_keeps_valid_values() -> None:
    raw = {
        "partyOne": {"companyName": "Acme Inc", "signerName": "Jane Doe"},
        "purpose": "Evaluating a partnership",
        "effectiveDate": "2026-07-14",
        "mndaTermType": "expires",
        "mndaTermYears": 2,
        "confidentialityTermType": "years",
        "confidentialityTermYears": 3,
        "governingLaw": "Delaware",
        "jurisdiction": "New Castle, DE",
    }

    fields = validate_extracted_fields(raw)

    assert fields.partyOne is not None
    assert fields.partyOne.companyName == "Acme Inc"
    assert fields.purpose == "Evaluating a partnership"
    assert fields.effectiveDate == "2026-07-14"
    assert fields.mndaTermType == "expires"
    assert fields.mndaTermYears == 2
    assert fields.confidentialityTermType == "years"
    assert fields.confidentialityTermYears == 3
    assert fields.governingLaw == "Delaware"
    assert fields.jurisdiction == "New Castle, DE"


def test_validate_extracted_fields_drops_blank_strings() -> None:
    fields = validate_extracted_fields({"purpose": "   ", "governingLaw": ""})
    assert fields.purpose is None
    assert fields.governingLaw is None


def test_validate_extracted_fields_drops_malformed_date() -> None:
    fields = validate_extracted_fields({"effectiveDate": "07/14/2026"})
    assert fields.effectiveDate is None


def test_validate_extracted_fields_drops_pre_1900_date() -> None:
    fields = validate_extracted_fields({"effectiveDate": "1899-12-31"})
    assert fields.effectiveDate is None


def test_validate_extracted_fields_drops_out_of_range_years() -> None:
    fields = validate_extracted_fields({"mndaTermYears": 100, "confidentialityTermYears": 0})
    assert fields.mndaTermYears is None
    assert fields.confidentialityTermYears is None


def test_validate_extracted_fields_drops_invalid_enum() -> None:
    fields = validate_extracted_fields({"mndaTermType": "forever"})
    assert fields.mndaTermType is None


def test_validate_extracted_fields_handles_non_dict_input() -> None:
    fields = validate_extracted_fields(None)
    assert fields == NdaFields()


def test_validate_extracted_fields_drops_non_dict_party() -> None:
    fields = validate_extracted_fields({"partyOne": "Acme Inc"})
    assert fields.partyOne is None


# --- _call_llm retry/repair ---------------------------------------------------


def test_call_llm_retries_once_after_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion_sequence(
            ["Sure, let's talk about your NDA!", json.dumps({"reply": "Got it", "fields": {}})]
        ),
    )

    result = chat_module._call_llm([chat_module.ChatMessage(role="user", content="hi")], NdaFields())

    assert result == {"reply": "Got it", "fields": {}}


def test_call_llm_raises_after_repeated_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion_sequence(["not json", "still not json"]),
    )

    with pytest.raises(LLMOutputError):
        chat_module._call_llm([chat_module.ChatMessage(role="user", content="hi")], NdaFields())


# --- merge_fields ------------------------------------------------------------


def test_merge_fields_merges_party_subfields() -> None:
    current = NdaFields(partyOne=chat_module.PartyFields(companyName="Acme Inc"))
    extracted = NdaFields(partyOne=chat_module.PartyFields(signerName="Jane Doe"))

    merged = merge_fields(current, extracted)

    assert merged.partyOne.companyName == "Acme Inc"
    assert merged.partyOne.signerName == "Jane Doe"


def test_merge_fields_overwrites_scalar_fields() -> None:
    current = NdaFields(purpose="Old purpose")
    extracted = NdaFields(purpose="New purpose")

    merged = merge_fields(current, extracted)

    assert merged.purpose == "New purpose"


def test_merge_fields_preserves_fields_not_mentioned() -> None:
    current = NdaFields(purpose="Evaluating a partnership", governingLaw="Delaware")
    extracted = NdaFields(jurisdiction="New Castle, DE")

    merged = merge_fields(current, extracted)

    assert merged.purpose == "Evaluating a partnership"
    assert merged.governingLaw == "Delaware"
    assert merged.jurisdiction == "New Castle, DE"


# --- POST /api/chat -----------------------------------------------------------


def test_chat_endpoint_returns_reply_and_extracted_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {
                "reply": "Got it, thanks!",
                "fields": {"partyOne": {"companyName": "Acme Inc"}},
            }
        ),
    )

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "We are Acme Inc"}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Got it, thanks!"
    assert body["fields"]["partyOne"]["companyName"] == "Acme Inc"


def test_chat_endpoint_merges_with_prior_known_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module,
        "completion",
        fake_completion(
            {
                "reply": "And the other party?",
                "fields": {"partyOne": {"signerName": "Jane Doe"}},
            }
        ),
    )

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Jane Doe will sign"}],
            "fields": {"partyOne": {"companyName": "Acme Inc"}},
        },
    )

    assert response.status_code == 200
    party_one = response.json()["fields"]["partyOne"]
    assert party_one["companyName"] == "Acme Inc"
    assert party_one["signerName"] == "Jane Doe"


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
        json={"messages": [{"role": "user", "content": "500 years"}]},
    )

    assert response.status_code == 200
    assert "mndaTermYears" not in response.json()["fields"]


def test_chat_endpoint_falls_back_when_reply_is_blank(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat_module, "completion", fake_completion({"reply": "  ", "fields": {}})
    )

    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "hi"}]})

    assert response.status_code == 200
    assert response.json()["reply"] == "Sorry, could you rephrase that?"


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
