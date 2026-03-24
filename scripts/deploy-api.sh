#!/usr/bin/env bash
set -euo pipefail

# Deploy API to Cloud Run via Docker + Terraform.
# Usage: ./scripts/deploy-api.sh [--skip-tests]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY="us-central1-docker.pkg.dev/melo-f5756/mello"
TAG="$(git rev-parse --short HEAD)"
IMAGE="$REGISTRY/api:$TAG"
DOCKER="${DOCKER:-docker}"
TF_DIR="$ROOT_DIR/infra/terraform"

echo "── Deploy API ─────────────────────────────────────────"

# Tests
if [[ "${1:-}" != "--skip-tests" ]]; then
  echo "→ Running API tests..."
  (cd "$ROOT_DIR/apps/api" && .venv/bin/pytest tests/ -q) || { echo "✗ Tests failed. Aborting."; exit 1; }
fi

# Build
echo "→ Building Docker image ($IMAGE)..."
"$DOCKER" build --platform linux/amd64 -t "$IMAGE" -f "$ROOT_DIR/apps/api/Dockerfile" "$ROOT_DIR"

# Push
echo "→ Pushing to Artifact Registry..."
"$DOCKER" push "$IMAGE"

# Deploy via Terraform
echo "→ Applying Terraform (image=$IMAGE)..."
(cd "$TF_DIR" && terraform apply -auto-approve -var="api_image=$IMAGE")

# Verify health
echo "→ Verifying deployment..."
API_URL=$(cd "$TF_DIR" && terraform output -raw api_url)
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✓ API deployed to $API_URL (health: 200)"
else
  echo "⚠ API deployed but health check returned $HTTP_CODE"
fi
