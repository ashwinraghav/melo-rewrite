# ── Cloud Run — API only ──────────────────────────────────────────────────────
#
# The API (FastAPI/Python) runs on Cloud Run.
# The web frontend is deployed to Firebase Hosting (CDN) — see firebase.tf.
#
# IMAGE STRATEGY:
#   var.api_image defaults to a placeholder Google "hello" image so the
#   service can be created before the first real build.
#   CI/CD overrides via: terraform apply -var="api_image=<registry>/<image>:<sha>"

resource "google_cloud_run_v2_service" "api" {
  name     = "mello-api"
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_ALL" # public

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = 0 # scale to zero when idle
      max_instance_count = 10
    }

    containers {
      image = var.api_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true # Only allocate CPU during request processing
      }

      env {
        name  = "ENV"
        value = "production"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "STORAGE_BUCKET"
        value = google_storage_bucket.stories.name
      }
      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }
      env {
        name  = "AUDIO_URL_TTL_SECONDS"
        value = tostring(var.audio_url_ttl_seconds)
      }
      env {
        name  = "PORT"
        value = "8080"
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_service_account.api,
  ]
}
