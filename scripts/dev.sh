#!/bin/bash
set -Eeuo pipefail

PORT=5000
PYTHON_PORT=8000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"

cd "${COZE_WORKSPACE_PATH}"

kill_port_if_listening() {
    local port=$1
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${port}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${port} is free."
      return
    fi
    echo "Port ${port} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
}

echo "Clearing ports ${DEPLOY_RUN_PORT} and ${PYTHON_PORT} before start."
kill_port_if_listening "${DEPLOY_RUN_PORT}"
kill_port_if_listening "${PYTHON_PORT}"

# Start Python backend on port 8000 (proxied by Express)
echo "Starting Python backend (FastAPI) on port ${PYTHON_PORT}..."
cd "${COZE_WORKSPACE_PATH}/backend"
PYTHON_PORT=${PYTHON_PORT} nohup uvicorn app.main:app --host 0.0.0.0 --port ${PYTHON_PORT} --reload > /app/work/logs/bypass/python-backend.log 2>&1 &
PYTHON_PID=$!
echo "Python backend PID: ${PYTHON_PID}"

# Wait for Python backend to be ready
cd "${COZE_WORKSPACE_PATH}"
echo "Waiting for Python backend to be ready..."
for i in $(seq 1 30); do
    if curl -s "http://127.0.0.1:${PYTHON_PORT}/health" > /dev/null 2>&1; then
        echo "Python backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Warning: Python backend not ready after 30s, continuing anyway..."
    fi
    sleep 1
done

# Start Express + Vite dev server on port 5000
echo "Starting Express + Vite dev server on port ${DEPLOY_RUN_PORT}..."
PORT=${DEPLOY_RUN_PORT} PYTHON_PORT=${PYTHON_PORT} pnpm tsx watch server/server.ts
