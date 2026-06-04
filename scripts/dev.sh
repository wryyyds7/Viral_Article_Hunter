#!/bin/bash
set -Eeuo pipefail

PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"

cd "${COZE_WORKSPACE_PATH}"

# Start Express + Vite dev server on port 5000
echo "Starting Express + Vite dev server on port ${DEPLOY_RUN_PORT}..."
PORT=${DEPLOY_RUN_PORT} pnpm tsx watch server/server.ts
