# ── GCP API enablement ────────────────────────────────────────────────────────
#
# All APIs required by Mello. Enabling them here means a fresh project can be
# stood up from scratch with a single `terraform apply`.
#
# EXISTING PROJECT NOTE: These APIs may already be enabled on melo-f5756.
# Terraform will no-op if they are. No `terraform import` needed for APIs.

locals {
  required_apis = [
    "run.googleapis.com",              # Cloud Run
    "cloudbuild.googleapis.com",       # Cloud Build (CI/CD)
    "artifactregistry.googleapis.com", # Docker image registry
    "firestore.googleapis.com",        # Firestore database
    "firebase.googleapis.com",         # Firebase platform
    "identitytoolkit.googleapis.com",  # Firebase Auth
    "storage.googleapis.com",          # Cloud Storage
    "secretmanager.googleapis.com",    # Secret Manager (future use)
    "iam.googleapis.com",              # IAM
    "cloudresourcemanager.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false # Disabling APIs on terraform destroy is dangerous in prod
}
