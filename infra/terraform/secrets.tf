# ── Secret Manager — creator service API keys ────────────────────────────────
#
# Secrets are created and versioned here. The Cloud Run service references them
# via the `env.value_source.secret_key_ref` block in cloudrun.tf.

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "anthropic-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "anthropic_api_key" {
  secret      = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key
}

resource "google_secret_manager_secret" "elevenlabs_api_key" {
  secret_id = "elevenlabs-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "elevenlabs_api_key" {
  secret      = google_secret_manager_secret.elevenlabs_api_key.id
  secret_data = var.elevenlabs_api_key
}

resource "google_secret_manager_secret" "cohere_api_key" {
  secret_id = "cohere-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "cohere_api_key" {
  secret      = google_secret_manager_secret.cohere_api_key.id
  secret_data = var.cohere_api_key
}

# ── IAM: let the API service account read the secrets ────────────────────────

resource "google_secret_manager_secret_iam_member" "api_anthropic" {
  secret_id = google_secret_manager_secret.anthropic_api_key.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_elevenlabs" {
  secret_id = google_secret_manager_secret.elevenlabs_api_key.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_cohere" {
  secret_id = google_secret_manager_secret.cohere_api_key.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}
