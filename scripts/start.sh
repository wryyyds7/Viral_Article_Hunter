#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

cd "${COZE_WORKSPACE_PATH}/backend"

echo "Starting Python backend (FastAPI + Uvicorn) on port ${DEPLOY_RUN_PORT}..."
PORT=$DEPLOY_RUN_PORT uvicorn app.main:app --host 0.0.0.0 --port ${DEPLOY_RUN_PORT} --workers 2
