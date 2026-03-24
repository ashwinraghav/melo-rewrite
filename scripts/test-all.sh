#!/usr/bin/env bash
set -euo pipefail

# Run all tests (API + Web). Fast feedback before deploying.
# Usage: ./scripts/test-all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "── Tests ──────────────────────────────────────────────"

echo "→ API tests (Python)..."
(cd "$ROOT_DIR/apps/api" && .venv/bin/pytest tests/ -q)

echo "→ Web tests (Vitest)..."
pnpm --filter @mello/web test

echo "✓ All tests passed"
