#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

docker build -t prelegal .
docker rm -f prelegal >/dev/null 2>&1 || true
docker run -d --name prelegal --env-file .env -p 8001:8001 prelegal
echo "Prelegal running at http://localhost:8001"
