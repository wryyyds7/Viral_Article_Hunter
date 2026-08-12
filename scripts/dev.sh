#!/bin/bash
set -Eeuo pipefail

PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"
PYTHON_PORT="${PYTHON_PORT:-8000}"

cd "${COZE_WORKSPACE_PATH}"

# 启动 Python FastAPI 后端 (后台运行)
echo "Starting Python FastAPI backend on port ${PYTHON_PORT}..."
cd backend
uvicorn app.main:app --host 0.0.0.0 --port "${PYTHON_PORT}" --reload &
BACKEND_PID=$!
cd "${COZE_WORKSPACE_PATH}"

# 等待后端就绪
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -s "http://127.0.0.1:${PYTHON_PORT}/health" > /dev/null 2>&1; then
    echo "Backend is ready."
    break
  fi
  sleep 1
done

# 启动 Express + Vite 前端 (前台运行)
echo "Starting Express + Vite dev server on port ${DEPLOY_RUN_PORT}..."
trap "kill ${BACKEND_PID} 2>/dev/null || true" EXIT INT TERM
PORT=${DEPLOY_RUN_PORT} pnpm tsx watch server/server.ts
