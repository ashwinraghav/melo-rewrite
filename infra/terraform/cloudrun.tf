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
      min_instance_count = 1 # keep one instance warm to avoid cold-start latency
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

      # Cloud Tasks — the API needs its own URL to enqueue task callbacks
      env {
        name  = "SERVICE_URL"
        value = "https://mello-api-rhp2tqs5qa-uc.a.run.app"
      }

      # Creator service secrets (from Secret Manager)
      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.anthropic_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "ELEVENLABS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.elevenlabs_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "ELEVENLABS_VOICE_ID"
        value = var.elevenlabs_voice_id
      }
      env {
        name  = "ELEVENLABS_MODEL_ID"
        value = var.elevenlabs_model_id
      }
      env {
        name = "COHERE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.cohere_api_key.secret_id
            version = "latest"
          }
        }
      }
      # PORT is set automatically by Cloud Run — do not set it manually

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
    google_secret_manager_secret_version.anthropic_api_key,
    google_secret_manager_secret_version.elevenlabs_api_key,
    google_secret_manager_secret_iam_member.api_anthropic,
    google_secret_manager_secret_iam_member.api_elevenlabs,
    google_secret_manager_secret_version.cohere_api_key,
    google_secret_manager_secret_iam_member.api_cohere,
  ]
}
