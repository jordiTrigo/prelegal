"""Resolution of static frontend files exported by Next.js (output: "export").

Mirrors nginx's `try_files $uri $uri.html =404`: an exact file match wins,
otherwise a flat `<route>.html` file is tried, otherwise 404.html is served.
"""

from pathlib import Path


def resolve_frontend_file(dist_dir: Path, request_path: str) -> tuple[Path, int]:
    """Return (file_path, status_code) for a request path, blocking traversal."""
    dist_dir = dist_dir.resolve()
    clean = request_path.strip("/")
    candidate = (dist_dir / clean).resolve() if clean else dist_dir / "index.html"
    if clean and dist_dir not in candidate.parents:
        return dist_dir / "404.html", 404
    if candidate.is_file():
        return candidate, 200
    html_candidate = dist_dir / f"{clean}.html"
    if clean and html_candidate.is_file():
        return html_candidate, 200
    return dist_dir / "404.html", 404
