#!/bin/bash
set -Eeuo pipefail

# 启动 Python FastAPI 后端 (uvicorn)
# 单独运行: bash scripts/start_backend.sh

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}/backend"

PORT="${PYTHON_PORT:-8000}"

echo "Starting Python FastAPI backend on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --reload
