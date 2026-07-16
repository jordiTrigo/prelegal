# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user can carry an AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in catalog.json file in the project root, included here:

@catalog.json

Before we start: the initial implementation was a frontend-only prototype that only supported the Mutual NDA document with no AI chat. This has since been rebuilt onto the full V1 technical foundation (backend, Docker, database, fake login) described below and in `docs/TASK-3.md`, and the form-based flow has been replaced with a freeform AI chat per `docs/TASK-4.md`. The product still only supports the Mutual NDA document until TASK-5 is built.

## Development process

When instructed to build a feature:

1. Read the ./docs/TASK-x.md file with the instructions.
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-20b:free` model. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

Note: OpenRouter discontinued the free tier of `openai/gpt-oss-120b` (confirmed via their `/models` API); `openai/gpt-oss-20b:free` is its free replacement. Cerebras is no longer pinned as the inference provider for chat: it doesn't host either free `gpt-oss-20b` variant (only the paid `gpt-oss-120b`, and the project's OpenRouter account currently has $0 credits), so the free 20b model is routed to whichever provider OpenRouter has available (currently Darkbloom). That provider doesn't always honor `response_format` on conversational prompts, so `backend/app/chat.py` retries once with a stricter JSON-only reminder and falls back to a friendly "could you rephrase" reply rather than a 502 if it still doesn't return valid JSON. The paid `openai/gpt-oss-120b` via Cerebras remains the documented upgrade path (~$0.037 / $0.17 per million prompt/completion tokens) if reliability or quality needs later outweigh the $0 cost — it requires adding credits to the OpenRouter account first.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project is packaged into a single Docker container.
The backend is in backend/, a `uv` project using FastAPI.
The frontend is in frontend/, statically exported (`output: "export"`) and served by FastAPI (no separate Node process at runtime).
The database uses SQLite and is created from scratch each time the Docker container is brought up, with a `users` table ready for sign up/sign in (no auth enforcement yet — see Implementation status). There are scripts in scripts/ for:

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

**TASK-4 (AI chat) — done**, on branch `feature/ai-chat-nda` (uncommitted / not yet in a PR):
- Replaced the field-by-field `NdaForm` with a freeform chat (`frontend/components/ChatPanel.tsx`): the user converses naturally and the assistant asks about whatever fields are still missing.
- New `POST /api/chat` endpoint (`backend/app/chat.py`) calls the LLM per the AI design section (LiteLLM via OpenRouter, `openrouter/openai/gpt-oss-20b:free`, Cerebras provider, Structured Outputs via a Pydantic `response_format`) to extract Mutual NDA fields from the conversation and draft a reply.
- Fields are modeled flat server-side (independent optional keys rather than a nested discriminated union) for reliable structured-output extraction, validated field-by-field (dropping any single bad value rather than rejecting the whole extraction), and merged onto the accumulated known fields turn by turn.
- The frontend (`frontend/lib/nda-chat.ts`) reconstructs the nested `NdaFormData` shape from the flat extracted fields for the existing Zod-validated live preview and PDF download, so `NdaDocument`/`generate-nda-pdf` are unchanged.
- Test coverage: `backend/tests/test_chat.py` (field validation, merging, endpoint behavior incl. LLM-failure handling), `frontend/__tests__/ChatPanel.test.tsx` and `nda-chat.test.ts`, and `frontend/e2e/chat-flow.spec.ts` (renamed from `nda-flow.spec.ts`) covering the chat-to-preview-to-download flow with a mocked `/api/chat`.

**Not yet implemented**: other document types beyond Mutual NDA (TASK-5), real authentication and per-user document history (TASK-6).
