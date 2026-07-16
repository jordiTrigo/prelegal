"""Unit tests for the static file resolver."""

from pathlib import Path

import pytest

from app.static import resolve_frontend_file


@pytest.fixture
def dist(tmp_path: Path) -> Path:
    (tmp_path / "_next" / "static").mkdir(parents=True)
    (tmp_path / "index.html").write_text("index")
    (tmp_path / "app.html").write_text("app")
    (tmp_path / "404.html").write_text("404")
    (tmp_path / "favicon.ico").write_text("icon")
    (tmp_path / "_next" / "static" / "chunk.js").write_text("js")
    return tmp_path


def test_root_serves_index(dist: Path) -> None:
    path, status = resolve_frontend_file(dist, "")
    assert (path, status) == (dist / "index.html", 200)


def test_flat_html_route(dist: Path) -> None:
    path, status = resolve_frontend_file(dist, "app")
    assert (path, status) == (dist / "app.html", 200)


def test_exact_asset_match(dist: Path) -> None:
    path, status = resolve_frontend_file(dist, "_next/static/chunk.js")
    assert (path, status) == (dist / "_next" / "static" / "chunk.js", 200)


def test_exact_file_at_root(dist: Path) -> None:
    path, status = resolve_frontend_file(dist, "favicon.ico")
    assert (path, status) == (dist / "favicon.ico", 200)


def test_unknown_route_returns_404_page(dist: Path) -> None:
    path, status = resolve_frontend_file(dist, "no-such-page")
    assert (path, status) == (dist / "404.html", 404)


def test_path_traversal_is_blocked(dist: Path) -> None:
    outside = dist.parent / "secret.txt"
    outside.write_text("secret")
    path, status = resolve_frontend_file(dist, "../secret.txt")
    assert (path, status) == (dist / "404.html", 404)


def test_trailing_slash_route(dist: Path) -> None:
    path, status = resolve_frontend_file(dist, "app/")
    assert (path, status) == (dist / "app.html", 200)
