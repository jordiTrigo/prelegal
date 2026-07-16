"""Prelegal backend: API under /api plus the statically exported frontend."""

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import FileResponse

from app.db import init_db
from app.settings import settings
from app.static import resolve_frontend_file


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


app.include_router(api_router)


# Registered after the API router so /api/* always wins over the frontend.
@app.get("/{full_path:path}")
def serve_frontend(request: Request, full_path: str) -> FileResponse:
    path, status = resolve_frontend_file(request.app.state.frontend_dist_dir, full_path)
    return FileResponse(path, status_code=status)
