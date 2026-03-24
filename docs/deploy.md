# Deploying Mello

All infrastructure is managed by Terraform. Frontend deploys via Firebase CLI.

## Architecture

- **Web**: Static Next.js export → Firebase Hosting (CDN)
- **API**: Python Docker container → Cloud Run
- **Infra**: Terraform in `infra/terraform/`

## Quick deploy (after initial setup)

```bash
./scripts/deploy-web.sh        # Frontend → Firebase Hosting (~15s)
./scripts/deploy-api.sh        # API → Cloud Run (~60s)
./scripts/deploy-all.sh        # Both
./scripts/test-all.sh          # Run all tests without deploying
```

Add `--skip-tests` to skip the test step.

## Prerequisites

- `gcloud` CLI installed and authenticated
- `gcloud auth application-default login` with quota project set
- Terraform ≥ 1.5.7
- Docker Desktop running (for API deploys)
- `firebase-tools` installed (`npm i -g firebase-tools`)
- `pnpm` installed

## First-time bootstrap

### 1. Terraform state bucket (one-time manual step)

```bash
gcloud storage buckets create gs://melo-f5756-tfstate \
  --project=melo-f5756 --location=US --uniform-bucket-level-access
```

### 2. Terraform init + apply

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

This creates: GCP APIs, Cloud Run API service, Artifact Registry, Cloud Storage bucket, service account + IAM, Firebase Hosting site.

### 3. Build and deploy API

```bash
./scripts/deploy-api.sh
```

### 4. Build and deploy web

```bash
./scripts/deploy-web.sh
```

## Production URLs

```bash
terraform -chdir=infra/terraform output api_url    # https://mello-api-rhp2tqs5qa-uc.a.run.app
terraform -chdir=infra/terraform output web_url    # https://melo-f5756.web.app
```

Custom domain: `https://melobooks.com` (Firebase Hosting)

## Local development

```bash
# API (Python)
cd apps/api
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn mello_api.asgi:app --reload --port 8080

# Web (Next.js)
pnpm install
pnpm --filter @mello/web dev
```

Tests run fully offline — no GCP credentials needed:

```bash
./scripts/test-all.sh
```
