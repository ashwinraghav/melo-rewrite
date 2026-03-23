# ── Service Accounts ──────────────────────────────────────────────────────────

# Dedicated service account for the API Cloud Run service.
# Principle of least privilege — only the permissions the API actually needs.
resource "google_service_account" "api" {
  account_id   = "mello-api"
  display_name = "Mello API Service Account"
  description  = "Used by the mello-api Cloud Run service"
  project      = var.project_id

  depends_on = [google_project_service.apis]
}

# ── Firestore access ───────────────────────────────────────────────────────────

resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# ── Cloud Storage access ───────────────────────────────────────────────────────

# The API reads story audio + artwork from the stories bucket.
resource "google_storage_bucket_iam_member" "api_storage_viewer" {
  bucket = google_storage_bucket.stories.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.api.email}"
}

# The API signs URLs on behalf of itself using its own service account credentials.
# This self-referential binding is required for Cloud Storage signed URL generation
# when using Application Default Credentials (ADC) on Cloud Run.
resource "google_service_account_iam_member" "api_token_creator" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.api.email}"
}

# ── Cloud Run invoker (public access) ─────────────────────────────────────────

# Both services are publicly accessible — users hit them directly from the browser.
# Authentication is handled at the application layer (Firebase ID tokens), not at
# the Cloud Run level.
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Cloud Build service account permissions ────────────────────────────────────

# Allow Cloud Build to push images to Artifact Registry and deploy to Cloud Run.
resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}
