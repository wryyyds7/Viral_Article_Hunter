#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing Python dependencies..."
pip install -r backend/requirements.txt -q 2>/dev/null || pip install -r backend/requirements.txt 2>/dev/null
echo "Build completed successfully!"
