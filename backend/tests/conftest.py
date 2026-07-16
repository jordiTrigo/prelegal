"""Shared fixtures: a fake Next.js export dir and a test client wired to it."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import settings as settings_module
from app.main import app


@pytest.fixture
def fake_out(tmp_path: Path) -> Path:
    """Minimal replica of a Next.js `output: "export"` directory."""
    out = tmp_path / "out"
    (out / "_next" / "static").mkdir(parents=True)
    (out / "index.html").write_text("<html>login</html>")
    (out / "app.html").write_text("<html>nda tool</html>")
    (out / "404.html").write_text("<html>not found</html>")
    (out / "_next" / "static" / "chunk.js").write_text("console.log('chunk')")
    return out


@pytest.fixture
def client(fake_out: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings_module.settings, "db_path", tmp_path / "test.db")
    app.state.frontend_dist_dir = fake_out
    with TestClient(app) as test_client:
        yield test_client
    del app.state.frontend_dist_dir
