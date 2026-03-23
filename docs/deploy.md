# Deploying Mello to Cloud Run

All infrastructure is managed by Terraform. Never run `gcloud run deploy` manually — Cloud Build handles deploys via `terraform apply`.

## Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth application-default login`)
- Terraform ≥ 1.5.7 (or OpenTofu) installed
- `pnpm` installed

## First-time bootstrap

The Terraform state bucket must exist before `terraform init`. Create it once manually:

```bash
gcloud storage buckets create gs://melo-f5756-tfstate \
  --project=melo-f5756 \
  --location=US \
  --uniform-bucket-level-access
```

Then initialise and apply:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars already has the correct values for melo-f5756

terraform init    # downloads providers, configures GCS backend
terraform plan    # review what will be created
terraform apply   # create all resources
```

On first apply the Cloud Run services will start with a placeholder "hello" image — this is expected. The real images are deployed by CI/CD.

## Importing existing GCP resources

The `melo-f5756` GCP project, Firestore database, and Firebase web app already exist. Import them so Terraform can manage them without destroying and recreating:

```bash
cd infra/terraform

# GCP APIs (import each enabled service individually)
terraform import 'google_project_service.apis["run.googleapis.com"]'              melo-f5756/run.googleapis.com
terraform import 'google_project_service.apis["cloudbuild.googleapis.com"]'       melo-f5756/cloudbuild.googleapis.com
terraform import 'google_project_service.apis["artifactregistry.googleapis.com"]' melo-f5756/artifactregistry.googleapis.com
terraform import 'google_project_service.apis["firestore.googleapis.com"]'        melo-f5756/firestore.googleapis.com
terraform import 'google_project_service.apis["firebase.googleapis.com"]'         melo-f5756/firebase.googleapis.com
terraform import 'google_project_service.apis["identitytoolkit.googleapis.com"]'  melo-f5756/identitytoolkit.googleapis.com
terraform import 'google_project_service.apis["storage.googleapis.com"]'          melo-f5756/storage.googleapis.com
terraform import 'google_project_service.apis["secretmanager.googleapis.com"]'    melo-f5756/secretmanager.googleapis.com
terraform import 'google_project_service.apis["iam.googleapis.com"]'              melo-f5756/iam.googleapis.com
terraform import 'google_project_service.apis["cloudresourcemanager.googleapis.com"]' melo-f5756/cloudresourcemanager.googleapis.com

# Storage bucket (if already created)
terraform import google_storage_bucket.stories melo-f5756/melo-f5756-stories

# Artifact Registry (if already created)
terraform import google_artifact_registry_repository.mello projects/melo-f5756/locations/us-central1/repositories/mello
```

Resources that don't yet exist (service accounts, Cloud Run services, IAM bindings) will be **created** by Terraform on `apply` — no import needed.

## CI/CD deploy flow (Cloud Build)

Every push to `main` triggers Cloud Build which:

1. Builds Docker images for `apps/api` and `apps/web`
2. Pushes them to Artifact Registry
3. Runs `terraform apply -var="api_image=<digest>" -var="web_image=<digest>"`

This means deployments are always atomic: infra changes and image updates happen in the same `apply`.

## Manual image deploy (emergency)

```bash
# Build and push API image
docker build -t us-central1-docker.pkg.dev/melo-f5756/mello/api:manual apps/api
docker push us-central1-docker.pkg.dev/melo-f5756/mello/api:manual

# Deploy via Terraform
cd infra/terraform
terraform apply \
  -var="api_image=us-central1-docker.pkg.dev/melo-f5756/mello/api:manual"
```

## Outputs

After `terraform apply`:

```bash
terraform output api_url              # https://mello-api-xxxx-uc.a.run.app
terraform output web_url              # https://mello-web-xxxx-uc.a.run.app
terraform output artifact_registry_url  # us-central1-docker.pkg.dev/melo-f5756/mello
```

## Local development

```bash
# Install deps
pnpm install

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# Run both services
pnpm dev
# API → http://localhost:8080
# Web → http://localhost:3000
```

Tests run fully offline — no GCP credentials needed:

```bash
pnpm test
```
