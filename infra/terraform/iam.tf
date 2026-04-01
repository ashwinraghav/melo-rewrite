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

# The API reads, uploads, and overwrites story audio + artwork in the stories bucket.
# objectAdmin covers read + create + delete (needed for overwriting on retry).
resource "google_storage_bucket_iam_member" "api_storage_admin" {
  bucket = google_storage_bucket.stories.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api.email}"
}

# The API calls Vertex AI Imagen for cover art generation (creator flow).
resource "google_project_iam_member" "api_vertex_ai" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# The API signs URLs on behalf of itself using its own service account credentials.
# This self-referential binding is required for Cloud Storage signed URL generation
# when using Application Default Credentials (ADC) on Cloud Run.
resource "google_service_account_iam_member" "api_token_creator" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.api.email}"
}

# ── Firebase Storage access (private voice data) ─────────────────────────────
#
# The API uploads voice recordings and converted audio to the Firebase Storage
# bucket (melo-f5756.firebasestorage.app). This is separate from the public
# stories bucket — voice data is private per-user via Security Rules.
resource "google_storage_bucket_iam_member" "api_firebase_storage" {
  bucket = google_storage_bucket.firebase_storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api.email}"
}

# ── Public read access to story assets ────────────────────────────────────────
#
# Cover art and audio for published stories are served directly via public GCS
# URLs, avoiding per-request signed URL generation. This eliminates server-side
# signing latency and lets browsers cache images with standard HTTP caching.
resource "google_storage_bucket_iam_member" "stories_public_read" {
  bucket = google_storage_bucket.stories.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ── Cloud Tasks ──────────────────────────────────────────────────────────────

# The API service account enqueues tasks to the Cloud Tasks queue.
resource "google_project_iam_member" "api_cloud_tasks_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# Cloud Tasks creates OIDC tokens signed as this service account when
# delivering tasks to the Cloud Run service.
resource "google_project_iam_member" "api_cloud_tasks_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# ── Observability (Cloud Trace + Cloud Monitoring) ───────────────────────────

# The API writes distributed traces to Cloud Trace via OpenTelemetry.
resource "google_project_iam_member" "api_trace_agent" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# The API writes custom business metrics to Cloud Monitoring via OpenTelemetry.
resource "google_project_iam_member" "api_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api.email}"
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

# ── Cloud Build service account permissions ────────────────────────────────────
#
# NOTE: The Cloud Build service account (PROJECT_NUMBER@cloudbuild.gserviceaccount.com)
# is auto-created on first Cloud Build usage. Uncomment these after running
# the first build, or after enabling Cloud Build in the console.
#
# resource "google_project_iam_member" "cloudbuild_run_admin" {
#   project = var.project_id
#   role    = "roles/run.admin"
#   member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
# }
#
# resource "google_project_iam_member" "cloudbuild_artifact_writer" {
#   project = var.project_id
#   role    = "roles/artifactregistry.writer"
#   member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
# }
#
# resource "google_project_iam_member" "cloudbuild_sa_user" {
#   project = var.project_id
#   role    = "roles/iam.serviceAccountUser"
#   member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
# }
