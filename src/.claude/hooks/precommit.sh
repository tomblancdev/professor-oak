#!/bin/bash
# Professor Oak Pre-Commit Hook
# Runs TypeScript build, type checking, and tests via Docker before commits

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate up to find the package root (src/.claude/hooks -> src)
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MCP_PATH="$PACKAGE_ROOT/mcp-server"

echo "=========================================="
echo "Professor Oak Pre-Commit Checks"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker and try again."
    exit 2
fi

echo ""
echo "[1/3] Installing dependencies and building TypeScript..."
echo "------------------------------------------"

MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$MCP_PATH:/app" \
    -w /app \
    node:20-alpine \
    sh -c "npm ci && npm run build"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: TypeScript build failed!"
    exit 2
fi

echo ""
echo "[2/3] Running type checking..."
echo "------------------------------------------"

MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$MCP_PATH:/app" \
    -w /app \
    node:20-alpine \
    sh -c "npm ci && npx tsc --noEmit"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Type checking failed!"
    exit 2
fi

echo ""
echo "[3/3] Running tests..."
echo "------------------------------------------"

MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$MCP_PATH:/app" \
    -w /app \
    node:20-alpine \
    sh -c "npm ci && npm run test:run"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Tests failed!"
    exit 2
fi

echo ""
echo "=========================================="
echo "All pre-commit checks passed!"
echo "=========================================="
exit 0
