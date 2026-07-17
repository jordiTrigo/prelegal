"""Application configuration resolved from environment variables."""

import os
from dataclasses import dataclass, field
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent


def _default_db_path() -> Path:
    return Path(os.environ.get("DB_PATH", _BACKEND_DIR / "data" / "app.db"))


def _default_frontend_dist_dir() -> Path:
    return Path(os.environ.get("FRONTEND_DIST_DIR", _REPO_ROOT / "frontend" / "out"))


def _default_templates_dir() -> Path:
    return Path(os.environ.get("TEMPLATES_DIR", _REPO_ROOT / "templates"))


@dataclass
class Settings:
    """Runtime settings; defaults fit local development from the repo layout."""

    db_path: Path = field(default_factory=_default_db_path)
    frontend_dist_dir: Path = field(default_factory=_default_frontend_dist_dir)
    templates_dir: Path = field(default_factory=_default_templates_dir)


settings = Settings()
