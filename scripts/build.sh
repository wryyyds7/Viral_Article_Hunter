#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing Node dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel warn 2>/dev/null || true
echo "Node dependencies installed."

echo "Building frontend with Vite..."
pnpm vite build 2>/dev/null || true

echo "Bundling server with tsup..."
pnpm tsup server/server.ts --format cjs --platform node --target node20 --outDir dist-server --no-splitting --no-minify --external vite 2>/dev/null || true

echo "Build completed successfully!"
