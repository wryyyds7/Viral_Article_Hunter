#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT=5000
PYTHON_PORT=8000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

cd "${COZE_WORKSPACE_PATH}"

# Start Python backend on port 8000
echo "Starting Python backend (FastAPI) on port ${PYTHON_PORT}..."
cd "${COZE_WORKSPACE_PATH}/backend"
PYTHON_PORT=${PYTHON_PORT} nohup uvicorn app.main:app --host 0.0.0.0 --port ${PYTHON_PORT} --workers 2 > /app/work/logs/bypass/python-backend.log 2>&1 &
PYTHON_PID=$!
echo "Python backend PID: ${PYTHON_PID}"

# Wait for Python backend
cd "${COZE_WORKSPACE_PATH}"
echo "Waiting for Python backend to be ready..."
for i in $(seq 1 30); do
    if curl -s "http://127.0.0.1:${PYTHON_PORT}/health" > /dev/null 2>&1; then
        echo "Python backend is ready!"
        break
    fi
    sleep 1
done

# Start Express production server on port 5000
echo "Starting Express production server on port ${DEPLOY_RUN_PORT}..."
PORT=$DEPLOY_RUN_PORT PYTHON_PORT=${PYTHON_PORT} node dist-server/server.js
