#!/usr/bin/env bash
set -euo pipefail

# Deploy web frontend via Firebase App Hosting (SSR on Cloud Run).
#
# Firebase App Hosting builds and deploys from the repo. This script:
#   1. Runs tests (unless --skip-tests)
#   2. Builds locally to catch errors early
#   3. Creates a new App Hosting rollout
#
# First-time setup:
#   firebase apphosting:backends:create --project melo-f5756 \
#     --location us-central1 --app-directory apps/web
#
# Usage: ./scripts/deploy-web.sh [--skip-tests]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "── Deploy Web (SSR / App Hosting) ────────────────────"

# Tests
if [[ "${1:-}" != "--skip-tests" ]]; then
  echo "→ Running web tests..."
  pnpm --filter @mello/web test || { echo "✗ Tests failed. Aborting."; exit 1; }
fi

# Build types
echo "→ Building types..."
pnpm --filter @mello/types build

# Local build to catch errors before triggering a remote build
echo "→ Verifying build..."
pnpm --filter @mello/web build

# Trigger App Hosting rollout
echo "→ Creating App Hosting rollout..."
firebase apphosting:rollouts:create --project melo-f5756 \
  --backend mello-web --location us-central1

echo "✓ Rollout triggered. Check status:"
echo "  firebase apphosting:rollouts:list --project melo-f5756 --backend mello-web"
