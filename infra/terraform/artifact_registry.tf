# ── Artifact Registry — Docker repository ─────────────────────────────────────
#
# All Docker images (api, web) are pushed here by Cloud Build and pulled by
# Cloud Run on deployment.

resource "google_artifact_registry_repository" "mello" {
  provider = google-beta

  project       = var.project_id
  location      = var.region
  repository_id = "mello"
  description   = "Mello Docker images"
  format        = "DOCKER"

  # Clean up old images automatically to keep storage costs low.
  # Keep the 10 most recent images per tag.
  cleanup_policies {
    id     = "keep-recent-images"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  labels = {
    app = "mello"
  }

  depends_on = [google_project_service.apis]
}
