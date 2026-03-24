#!/usr/bin/env bash
set -euo pipefail

# Deploy web frontend to Firebase Hosting CDN.
# Usage: ./scripts/deploy-web.sh [--skip-tests]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_URL="${NEXT_PUBLIC_API_URL:-https://mello-api-rhp2tqs5qa-uc.a.run.app}"

echo "── Deploy Web ─────────────────────────────────────────"

# Tests
if [[ "${1:-}" != "--skip-tests" ]]; then
  echo "→ Running web tests..."
  pnpm --filter @mello/web test || { echo "✗ Tests failed. Aborting."; exit 1; }
fi

# Build types
echo "→ Building types..."
pnpm --filter @mello/types build

# Build static export with production API URL
echo "→ Building static export (API_URL=$API_URL)..."
NEXT_PUBLIC_API_URL="$API_URL" pnpm --filter @mello/web build

# Deploy
echo "→ Deploying to Firebase Hosting..."
firebase deploy --only hosting --project melo-f5756

echo "✓ Web deployed to https://melo-f5756.web.app"
