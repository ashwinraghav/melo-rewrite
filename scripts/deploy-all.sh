#!/usr/bin/env bash
set -euo pipefail

# Deploy everything: tests → API → Web
# Usage: ./scripts/deploy-all.sh [--skip-tests]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "══ Full Deploy ══════════════════════════════════════════"

"$SCRIPT_DIR/deploy-api.sh" "${1:-}"
"$SCRIPT_DIR/deploy-web.sh" "${1:-}"

echo "══ All deployments complete ════════════════════════════"
