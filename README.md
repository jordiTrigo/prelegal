# prelegal

A platform for drafting common legal agreements.

## Running

Requires Docker and a `.env` file in the project root (see `.env.example`).

```bash
scripts/start-linux.sh    # or start-mac.sh / start-windows.sh
scripts/stop-linux.sh     # or stop-mac.sh / stop-windows.sh
```

The app is served at http://localhost:8001. The SQLite database is recreated
from scratch every time the container starts.

## Development

- `backend/` — FastAPI (uv project). Serves the API under `/api` and the
  statically built frontend. Tests: `uv run pytest`
- `frontend/` — Next.js, statically exported (`npm run build` -> `out/`).
  Tests: `npm test` (Jest) and `npm run test:e2e` (Playwright, builds the
  frontend and runs the real backend on port 8001)

## Status

🚧 **Work in progress** — this project is currently under active development.
