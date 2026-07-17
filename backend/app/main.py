"""Prelegal backend: API under /api plus the statically exported frontend."""

from contextlib import asynccontextmanager

from fastapi import APIRouter, Cookie, FastAPI, Request, Response
from fastapi.responses import FileResponse, RedirectResponse

from app.auth import SESSION_COOKIE_NAME, has_valid_session
from app.auth_router import router as auth_router
from app.chat import router as chat_router
from app.db import init_db
from app.document_types_router import router as document_types_router
from app.documents_router import router as documents_router
from app.settings import settings
from app.static import resolve_frontend_file

# Static-export routes that require a signed-in session; the catch-all below
# redirects to / instead of serving these when the session cookie is absent
# or invalid. Checked by exact path segment, not prefix, so it can't collide
# with unrelated static assets (e.g. _next/static/*).
PROTECTED_PATHS = {"app", "documents"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(settings.db_path)
    if not hasattr(app.state, "frontend_dist_dir"):
        app.state.frontend_dist_dir = settings.frontend_dist_dir
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api_router.include_router(chat_router)
api_router.include_router(document_types_router)
api_router.include_router(auth_router)
api_router.include_router(documents_router)
app.include_router(api_router)


# Registered after the API router so /api/* always wins over the frontend.
@app.get("/{full_path:path}")
def serve_frontend(
    request: Request,
    full_path: str,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> Response:
    if full_path.strip("/") in PROTECTED_PATHS and not has_valid_session(session_token):
        return RedirectResponse("/")
    path, status = resolve_frontend_file(request.app.state.frontend_dist_dir, full_path)
    return FileResponse(path, status_code=status)
