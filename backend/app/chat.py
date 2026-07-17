"""AI chat endpoint: freeform conversation that first figures out which
supported document type the user wants, then extracts its fields.

Uses loose `json_object` response formatting rather than a strict
Pydantic/json_schema response_format: the free model in use is only
available via a provider that doesn't reliably honor schema-constrained
decoding, so the exact output shape is spelled out in the prompt instead
and validated field-by-field on the way out (see document_types.py).
"""

import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel

from app import document_types
from app.document_types import DocumentTypeDescriptor

logger = logging.getLogger(__name__)

# Cerebras doesn't host this free model (only the paid openai/gpt-oss-120b),
# so OpenRouter routes it to whichever provider is available - currently
# Darkbloom, which doesn't always honor response_format on conversational
# prompts. _call_llm retries once with a stricter reminder before giving up.
MODEL = "openrouter/openai/gpt-oss-20b:free"

JSON_ONLY_REMINDER = (
    "Reminder: reply with ONLY a single JSON object matching the schema - "
    "no markdown, no prose outside the JSON."
)
MAX_LLM_ATTEMPTS = 2


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    documentType: str | None = None
    fields: dict[str, Any] = {}


class ChatResponse(BaseModel):
    reply: str
    documentType: str | None = None
    fields: dict[str, Any] = {}


class LLMOutputError(Exception):
    """Raised when the model never returns valid JSON, even after a retry."""


def _call_llm(system_prompt: str, messages: list[ChatMessage]) -> dict:
    llm_messages = [{"role": "system", "content": system_prompt}]
    llm_messages += [{"role": m.role, "content": m.content} for m in messages]

    for attempt in range(MAX_LLM_ATTEMPTS):
        if attempt:
            llm_messages.append({"role": "system", "content": JSON_ONLY_REMINDER})
        response = completion(
            model=MODEL,
            messages=llm_messages,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            continue

    raise LLMOutputError("Model did not return valid JSON after retrying")


def _valid_reply(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _ensure_followup_question(
    reply: str, descriptor: DocumentTypeDescriptor, fields: dict[str, Any]
) -> str:
    """Guarantee a follow-up question when fields are still missing, rather
    than trusting the model's instruction-following alone (which this
    free-tier model doesn't always honor)."""
    missing = document_types.missing_required_fields(descriptor, fields)
    if missing and "?" not in reply:
        return f"{reply} Could you tell me about the {missing[0].lower()}?"
    return reply


def _handle_classification(request: ChatRequest) -> ChatResponse:
    prompt = document_types.build_classification_prompt()
    raw = _call_llm(prompt, request.messages)
    reply = _valid_reply(raw.get("reply")) or "Sorry, could you rephrase that?"

    candidate = raw.get("documentType")
    descriptor = document_types.REGISTRY.get(candidate) if isinstance(candidate, str) else None
    if descriptor is None:
        return ChatResponse(reply=reply, documentType=None, fields={})

    reply = _ensure_followup_question(reply, descriptor, {})
    return ChatResponse(reply=reply, documentType=descriptor.id, fields={})


def _handle_fields(request: ChatRequest, descriptor: DocumentTypeDescriptor) -> ChatResponse:
    prompt = document_types.build_field_prompt(descriptor, request.fields)
    raw = _call_llm(prompt, request.messages)
    reply = _valid_reply(raw.get("reply")) or "Sorry, could you rephrase that?"

    extracted = document_types.validate_fields(descriptor, raw.get("fields"))
    merged = document_types.merge_fields(descriptor, request.fields, extracted)
    reply = _ensure_followup_question(reply, descriptor, merged)
    return ChatResponse(reply=reply, documentType=descriptor.id, fields=merged)


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, response_model_exclude_none=True)
def chat(request: ChatRequest) -> ChatResponse:
    descriptor = (
        document_types.REGISTRY.get(request.documentType) if request.documentType else None
    )

    try:
        if descriptor is None:
            return _handle_classification(request)
        return _handle_fields(request, descriptor)
    except LLMOutputError:
        logger.warning("Model did not return valid JSON after retrying")
        return ChatResponse(
            reply="Sorry, could you rephrase that?",
            documentType=request.documentType,
            fields=request.fields,
        )
    except Exception as exc:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail="Chat service unavailable") from exc
