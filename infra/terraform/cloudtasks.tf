# ── Cloud Tasks ───────────────────────────────────────────────────────────────
#
# Single queue for all background tasks (story publish, voice clone, story
# conversion). Cloud Tasks delivers HTTP requests to internal endpoints on
# the same Cloud Run service with OIDC authentication.

resource "google_cloud_tasks_queue" "background" {
  name     = "mello-background"
  location = var.region
  project  = var.project_id

  retry_config {
    max_attempts       = 3
    min_backoff        = "10s"
    max_backoff        = "300s"
    max_doublings      = 3
  }

  rate_limits {
    max_concurrent_dispatches = 3
    max_dispatches_per_second = 1
  }

  depends_on = [google_project_service.apis]
}
