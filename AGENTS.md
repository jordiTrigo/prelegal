# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user can carry an AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in catalog.json file in the project root, included here:

@catalog.json

Before we start: the initial implementation was a frontend-only prototype that only supported the Mutual NDA document with no AI chat. This has since been rebuilt onto the full V1 technical foundation (backend, Docker, database, fake login) described below and in `docs/TASK-3.md`, the form-based flow was replaced with a freeform AI chat per `docs/TASK-4.md`, the product now supports all 11 document types in catalog.json per `docs/TASK-5.md`, and it now has real multi-user sign-up/sign-in and per-user document history per `docs/TASK-6.md`.

## Development process

When instructed to build a feature:

1. Read the ./docs/TASK-x.md file with the instructions.
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-20b:free` model. Interpret the results with JSON mode (`response_format={"type": "json_object"}`) and an explicit output-shape instruction in the prompt so you can populate fields in the legal document — see the note below on why strict Structured Outputs (schema-constrained `response_format`) isn't used here.

Note: OpenRouter discontinued the free tier of `openai/gpt-oss-120b` (confirmed via their `/models` API); `openai/gpt-oss-20b:free` is its free replacement. Cerebras is no longer pinned as the inference provider for chat: it doesn't host either free `gpt-oss-20b` variant (only the paid `gpt-oss-120b`, and the project's OpenRouter account currently has $0 credits), so the free 20b model is routed to whichever provider OpenRouter has available (currently Darkbloom). That provider doesn't always honor `response_format` on conversational prompts, so `backend/app/chat.py` retries once with a stricter JSON-only reminder and falls back to a friendly "could you rephrase" reply rather than a 502 if it still doesn't return valid JSON. The paid `openai/gpt-oss-120b` via Cerebras remains the documented upgrade path (~$0.037 / $0.17 per million prompt/completion tokens) if reliability or quality needs later outweigh the $0 cost — it requires adding credits to the OpenRouter account first.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project is packaged into a single Docker container.
The backend is in backend/, a `uv` project using FastAPI.
The frontend is in frontend/, statically exported (`output: "export"`) and served by FastAPI (no separate Node process at runtime).
The database uses SQLite and is created from scratch each time the Docker container is brought up, with `users`, `sessions`, and `documents` tables (see TASK-6 in Implementation status for the auth/history design). There are scripts in scripts/ for:

```bash
# Mac
scripts/start-mac.sh  # Start
scripts/stop-mac.sh   # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.sh
scripts/stop-windows.sh
```
Backend available at http://localhost:8001

## Color Scheme
- Accent Yellow: #ecad0a
- Blue Primary: #209dd7
- Purple Secondary: #753991
- Dark Navy: #032147
- Gray Text: #888888

## Implementation status

**TASK-3 (V1 foundations) — done**, PR #5:
- FastAPI backend (`backend/`) serving `/api/*` and the statically exported frontend via a `try_files`-style catch-all with path-traversal protection.
- SQLite wiped and recreated on every startup with a `users` table (schema only, no auth endpoints).
- Frontend statically exported; PDF generation moved client-side (`@react-pdf/renderer`'s `pdf().toBlob()`, lazy-loaded) since a static export can't run server-side POST routes.
- Fake login screen at `/` (any input enters the platform, no real auth) leading to the Mutual NDA tool at `/app`.
- Single multi-stage Dockerfile (Node build → Python/uv runtime) and the six start/stop scripts.
- Test coverage: pytest (backend), Jest (frontend units), Playwright (e2e across chromium/firefox/webkit, including axe accessibility, run against the real FastAPI server).

**TASK-4 (AI chat) — done**, PR #6 (merged to `main`):
- Replaced the field-by-field `NdaForm` with a freeform chat (`frontend/components/ChatPanel.tsx`): the user converses naturally and the assistant asks about whatever fields are still missing.
- New `POST /api/chat` endpoint (`backend/app/chat.py`) calls the LLM per the AI design section (LiteLLM via OpenRouter, `openrouter/openai/gpt-oss-20b:free`, JSON mode) to extract Mutual NDA fields from the conversation and draft a reply.
- Fields are modeled flat server-side (independent optional keys rather than a nested discriminated union) for a simpler shape to spell out in the prompt, validated field-by-field (dropping any single bad value rather than rejecting the whole extraction), and merged onto the accumulated known fields turn by turn.
- The frontend (`frontend/lib/nda-chat.ts`) reconstructed the nested `NdaFormData` shape from the flat extracted fields for a Zod-validated live preview and PDF download (`NdaDocument`/`generate-nda-pdf`); all Mutual-NDA-specific, superseded by the generic pipeline in TASK-5 below.
- Post-merge fix: the originally specified `openai/gpt-oss-120b:free` model was discontinued by OpenRouter mid-build, which surfaced as a 502 on every chat message. Swapped to `openai/gpt-oss-20b:free`, moved off strict Structured Outputs to JSON mode (the only provider backing the free model doesn't reliably honor schema-constrained decoding), and added a one-shot retry plus a graceful in-chat fallback reply instead of a 502 — see the AI design section above for the full rationale.

**TASK-5 (all document types) — done**, PR #7 (merged to `main`):
- Replaced the Mutual-NDA-only pipeline with a registry-driven system covering all 11 catalog.json document types. `scripts/generate_registry.py` extracts each template's field taxonomy from its `<span class="X_link">Label</span>` placeholders (Mutual NDA's own Standard Terms file uses the same convention, so it fits the same system) and writes two generated artifacts together — `templates/registry/<id>.json` (backend source of truth) and `frontend/lib/document-registry/<id>.json` (frontend copy) — re-run it after editing a template.
- Backend: `backend/app/document_types.py` replaces the old `NdaFields` class with a generic `FieldSpec`-driven model (text/date/integer/list/enum/party), field-by-field validation, merging, and prompt generation. `backend/app/chat.py`'s `/api/chat` now dispatches: with no resolved `documentType` it runs a classification prompt (list the catalog, infer the type, or explain+suggest the closest match for an unsupported request per `docs/TASK-5.md`'s requirement); once resolved it runs a field-collection prompt scoped to that type. `backend/app/document_types_router.py` adds `GET /api/document-types/{id}` serving the raw template markdown to the frontend.
- Frontend: `frontend/lib/markdown-template.ts` is a hand-rolled parser (not a markdown-AST library — `@react-pdf/renderer` can't consume one either way, so a library wouldn't remove the hard part) for the templates' narrow dialect (headings, nested ordered-list items, bold, field spans), rendered generically as HTML (`DocumentPreview.tsx`) and PDF (`DocumentPdfPreview.tsx`) instead of the old hand-transcribed NDA clause prose. `frontend/lib/field-format.ts` holds the two Mutual-NDA-specific "compound field" display formatters (MNDA Term, Term of Confidentiality — each combines an enum + a conditional integer field), the only remaining NDA-specific code in the generic pipeline.
- Also fixed: `Dockerfile` wasn't copying `templates/` into the runtime image (the new registry/template-serving endpoints would 404/500 in production without it); two UX fixes independent of the multi-document work — `ChatPanel.tsx` now returns focus to the message input after every reply (success or error), and `chat.py`'s `_ensure_followup_question` guarantees a follow-up question when required fields are still missing, rather than relying on the free-tier model's instruction-following alone.
- Test coverage: `backend/tests/test_document_types.py`, `test_chat.py` (rewritten for the classification/field-collection dispatch), `test_document_types_router.py`; `frontend/__tests__/markdown-template.test.ts` (incl. real DPA depth-4-nesting fixtures), `field-format.test.ts`, `document-registry.test.ts`, `document-fields.test.ts`, `DocumentPreview.test.tsx`, `generate-document-pdf.test.tsx`, updated `ChatPanel.test.tsx`; `frontend/e2e/chat-flow.spec.ts` (multi-document + unsupported-document flows), `accessibility.spec.ts`, `login.spec.ts` (all across chromium/firefox/webkit).

**TASK-6 (multi-user auth, document history, polish) — done**, PR #8 (open, not yet merged):
- Replaced the fake "any input works" login with real accounts: `backend/app/auth.py` (pbkdf2_hmac password hashing with a per-password random salt; opaque `secrets.token_urlsafe` session tokens stored in a new `sessions` table rather than a signed cookie, so validity is a DB lookup and sessions naturally invalidate on process restart along with the rest of the temporary database) and `backend/app/auth_router.py` (`POST /api/auth/signup`, `/signin`, `/signout`, `GET /api/auth/me`). `authenticate_user` always runs the password hash even for an unknown email (against a precomputed dummy hash) so failed sign-ins don't leak which emails are registered via response timing.
- `backend/app/main.py`'s static-file catch-all now redirects `/app` and `/documents` to `/` when the session cookie is missing or invalid, gating those routes server-side before the HTML is ever served.
- Per-user document history: `backend/app/documents_router.py` (`POST`/`GET /api/documents`, both gated by session) saves `{documentType, fields}` the moment a PDF download completes (`frontend/app/app/page.tsx`), not on every chat turn - re-downloading an unchanged document is idempotent (deduped server-side against the user's latest saved row for that type) rather than piling up duplicate history rows. `frontend/app/documents/page.tsx` ("My Documents") lists them and regenerates the PDF from the stored fields on demand via the same `generateDocumentPdfBlob` pipeline TASK-5 built, so it stays correct if a document type's template changes later.
- New pages: `frontend/app/signup/page.tsx`, `frontend/app/documents/page.tsx`, plus a shared `frontend/components/AppHeader.tsx` (nav + sign out, self-fetches `/api/auth/me`) on both authenticated pages, and a shared `frontend/lib/download-pdf.ts` used by both download call sites.
- Added `DRAFT_DISCLAIMER` (`frontend/lib/attribution.ts`) - a "this is AI-drafted, not legal advice, have a lawyer review it" notice shown in both the live preview and the generated PDF.
- Editing a saved document: each "My Documents" row also has an **Edit** button. `frontend/lib/resume-document.ts` stashes the document's id/type/fields in `sessionStorage` (a one-time, same-tab handoff - simpler than a dynamic route or a fetch-by-id endpoint, since the documents page already has the full record) and `/app` restores it on mount, showing the preview immediately with a "welcome back" greeting. `POST /api/documents` now accepts an optional `documentId`; when present, `documents_router.py` updates that row in place (verifying ownership) instead of inserting, so editing and re-downloading updates the same history entry rather than creating a new one. If the conversation moves to a different document type mid-edit, the frontend drops the tracked id so the next save creates a fresh entry instead of overwriting the original.
- Test coverage: `backend/tests/test_auth.py`, `test_documents.py` (incl. save-idempotency and the update-in-place/ownership-check behavior), extended `test_app.py`/`test_db.py`, a `signed_up_client` fixture in `conftest.py`; `frontend/__tests__/LoginPage.test.tsx` (rewritten for real sign-in), `SignupPage.test.tsx`, `AppHeader.test.tsx`, `DocumentsPage.test.tsx`, `HomePage.test.tsx` and `resume-document.test.ts` (the edit/resume flow); `frontend/e2e/auth-helpers.ts` (shared `signUpAndLand`/`signOutAndLand` helpers, following the existing hydration-race `.toPass()` retry convention), rewritten `login.spec.ts`, `documents-flow.spec.ts` (incl. the edit-updates-same-row flow end to end), and existing specs updated to sign in first now that `/app` is gated (all across chromium/firefox/webkit).

Nothing from the original TASK-1 through TASK-6 docs remains unimplemented.
