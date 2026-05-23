#!/usr/bin/env bash
# Local dev: runs FastAPI on :8000 and Vite on :5173 (which proxies /api → :8000).
# Vercel's Python runtime treats api/ as cwd; we mirror that locally so the
# `from agent import ...` style imports work the same way in both environments.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt uvicorn

if [ -f .env ]; then
  set -a; source .env; set +a
fi

trap 'kill 0' EXIT
( cd api && uvicorn index:app --reload --port 8000 ) &
( npm run dev ) &
wait
