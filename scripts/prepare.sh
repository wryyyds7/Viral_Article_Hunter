#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing Python dependencies..."
pip install -r backend/requirements.txt -q 2>/dev/null || pip install -r backend/requirements.txt 2>/dev/null
echo "Python dependencies installed."

# Also install Node deps for Vite dev server (frontend)
if [ -f package.json ]; then
  echo "Installing Node dependencies for frontend..."
  pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel warn 2>/dev/null || true
  echo "Node dependencies installed."
fi

if command -v coze > /dev/null 2>&1 && coze check-bins --help > /dev/null 2>&1; then
  coze check-bins --fix 2>/dev/null || true
fi
