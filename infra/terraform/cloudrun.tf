# ── Cloud Run services ────────────────────────────────────────────────────────
#
# Two services: mello-api (Fastify) and mello-web (Next.js).
# Both use the v2 API for the latest Cloud Run features.
#
# IMAGE STRATEGY:
#   var.api_image / var.web_image default to a placeholder Google "hello"
#   image so the service can be created before the first real build.
#   CI/CD (Cloud Build) overrides these via:
#     terraform apply -var="api_image=<registry>/<image>:<sha>"

# ── API ────────────────────────────────────────────────────────────────────────

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

# ── Web ────────────────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "web" {
  name     = "mello-web"
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.web_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://${google_cloud_run_v2_service.api.uri}"
      }

      # Firebase public config — non-secret, safe as plain env vars
      env {
        name  = "NEXT_PUBLIC_FIREBASE_API_KEY"
        value = "AIzaSyCBH3p0XEB1OuYl03YX8W9f8jbU-jhrwVg"
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
        value = "melo-f5756.firebaseapp.com"
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
        value = "melo-f5756.firebasestorage.app"
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
        value = var.project_number
      }
      env {
        name  = "NEXT_PUBLIC_FIREBASE_APP_ID"
        value = "1:888632552624:web:fd61ffda6ea81926fc5f75"
      }
      env {
        name  = "PORT"
        value = "3000"
      }

      ports {
        container_port = 3000
      }

      startup_probe {
        http_get {
          path = "/"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 5
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_cloud_run_v2_service.api,
  ]
}
