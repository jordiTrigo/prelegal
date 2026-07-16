"""AI chat endpoint: freeform conversation that extracts Mutual NDA fields.

Fields are modeled flat (mndaTermType/mndaTermYears as independent optional
keys, not a nested discriminated union) since strict structured-output modes
across LLM providers support flat optional/enum fields far more reliably than
nested oneOf/discriminator schemas. The frontend reconstructs the nested
NdaFormData shape for its own Zod-validated preview.
"""

import json
import re
from typing import Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b:free"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MIN_EFFECTIVE_DATE_YEAR = 1900
MIN_TERM_YEARS = 1
MAX_TERM_YEARS = 99


class PartyFields(BaseModel):
    companyName: str | None = None
    signerName: str | None = None
    signerTitle: str | None = None
    noticeAddress: str | None = None


class NdaFields(BaseModel):
    """Flat partial mirror of the frontend's NdaFormData (nda-schema.ts).

    Mutual-NDA-specific; a future task expanding to other document types will
    need an equivalent per document type rather than a generalized version of
    this model.
    """

    partyOne: PartyFields | None = None
    partyTwo: PartyFields | None = None
    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTermType: Literal["expires", "until_terminated"] | None = None
    mndaTermYears: int | None = None
    confidentialityTermType: Literal["years", "perpetuity"] | None = None
    confidentialityTermYears: int | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: NdaFields = NdaFields()


class ChatResponse(BaseModel):
    reply: str
    fields: NdaFields


SYSTEM_PROMPT_TEMPLATE = """You are helping a user fill in a Mutual Non-Disclosure Agreement \
through natural conversation.

Fields to collect:
- partyOne / partyTwo: companyName, signerName, signerTitle, noticeAddress (email or postal)
- purpose: what the parties are discussing or evaluating
- effectiveDate: ISO date YYYY-MM-DD
- mndaTermType: "expires" or "until_terminated"; if "expires", also collect mndaTermYears (1-99)
- confidentialityTermType: "years" or "perpetuity"; if "years", also collect \
confidentialityTermYears (1-99)
- governingLaw: the governing law (e.g. a US state)
- jurisdiction: city/county and state for legal venue

Fields already known from this conversation (do not ask about these again unless the user \
changes them):
{known_fields_json}

Instructions:
1. Extract any of the above fields the user's latest message reveals, however partial. Only \
include a field if the user actually stated it - never guess or invent a value.
2. Write a short, friendly reply (2-4 sentences) acknowledging what you learned and asking \
about one or two still-missing fields. Do not interrogate with a full checklist.
3. If everything is known, tell the user the NDA is ready to preview and download.
"""


def _build_system_prompt(known_fields: NdaFields) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        known_fields_json=known_fields.model_dump_json(exclude_none=True)
    )


def _call_llm(messages: list[ChatMessage], known_fields: NdaFields) -> dict:
    llm_messages = [{"role": "system", "content": _build_system_prompt(known_fields)}]
    llm_messages += [{"role": m.role, "content": m.content} for m in messages]
    response = completion(
        model=MODEL,
        messages=llm_messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return json.loads(response.choices[0].message.content)


def _valid_party(raw: object) -> PartyFields | None:
    if not isinstance(raw, dict):
        return None
    cleaned = {
        key: value.strip()
        for key, value in raw.items()
        if key in PartyFields.model_fields and isinstance(value, str) and value.strip()
    }
    return PartyFields(**cleaned) if cleaned else None


def _valid_text(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _valid_date(value: object) -> str | None:
    if not isinstance(value, str) or not DATE_PATTERN.match(value):
        return None
    if int(value[:4]) < MIN_EFFECTIVE_DATE_YEAR:
        return None
    return value


def _valid_years(value: object) -> int | None:
    if not isinstance(value, int) or isinstance(value, bool):
        return None
    return value if MIN_TERM_YEARS <= value <= MAX_TERM_YEARS else None


def _valid_literal(value: object, choices: tuple[str, ...]) -> str | None:
    return value if value in choices else None


def validate_extracted_fields(raw: object) -> NdaFields:
    """Validate each field independently; drop any that fail rather than
    rejecting the whole extraction over one bad value."""
    fields = raw if isinstance(raw, dict) else {}
    return NdaFields(
        partyOne=_valid_party(fields.get("partyOne")),
        partyTwo=_valid_party(fields.get("partyTwo")),
        purpose=_valid_text(fields.get("purpose")),
        effectiveDate=_valid_date(fields.get("effectiveDate")),
        mndaTermType=_valid_literal(fields.get("mndaTermType"), ("expires", "until_terminated")),
        mndaTermYears=_valid_years(fields.get("mndaTermYears")),
        confidentialityTermType=_valid_literal(
            fields.get("confidentialityTermType"), ("years", "perpetuity")
        ),
        confidentialityTermYears=_valid_years(fields.get("confidentialityTermYears")),
        governingLaw=_valid_text(fields.get("governingLaw")),
        jurisdiction=_valid_text(fields.get("jurisdiction")),
    )


def merge_fields(current: NdaFields, extracted: NdaFields) -> NdaFields:
    """Merge newly extracted fields onto the accumulated known fields.

    Party sub-objects merge key-by-key; every other field is replaced
    wholesale when present in `extracted`.
    """
    merged = current.model_dump(exclude_none=True)
    for key, value in extracted.model_dump(exclude_none=True).items():
        if key in ("partyOne", "partyTwo") and key in merged:
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return NdaFields(**merged)


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, response_model_exclude_none=True)
def chat(request: ChatRequest) -> ChatResponse:
    try:
        raw = _call_llm(request.messages, request.fields)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Chat service unavailable") from exc

    reply = _valid_text(raw.get("reply")) or "Sorry, could you rephrase that?"
    extracted = validate_extracted_fields(raw.get("fields"))
    merged = merge_fields(request.fields, extracted)
    return ChatResponse(reply=reply, fields=merged)
