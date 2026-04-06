# ── Story content bucket ──────────────────────────────────────────────────────
#
# Separate from the Firebase default bucket (melo-f5756.firebasestorage.app).
# Keeps user-uploaded admin content isolated from Firebase SDK traffic.
#
# Layout inside the bucket:
#   stories/{storyId}/audio.mp3
#   stories/{storyId}/cover.webp

resource "google_storage_bucket" "stories" {
  name          = "${var.project_id}-stories"
  location      = "US"
  project       = var.project_id
  force_destroy = false # Never auto-delete story content

  # Uniform bucket-level access — no per-object ACLs.
  # Access is granted via IAM only (the API service account).
  uniform_bucket_level_access = true

  versioning {
    enabled = false # Audio files don't need versioning
  }

  lifecycle_rule {
    # Move infrequently accessed audio to Nearline after 90 days (cheaper storage)
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 90
    }
  }

  cors {
    origin          = ["https://melostories.com", "https://www.melostories.com", "https://melobooks.com", "https://www.melobooks.com", "https://melo-f5756.web.app"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Content-Length", "Accept-Ranges"]
    max_age_seconds = 3600
  }

  labels = {
    app = "mello"
    env = "production"
  }

  depends_on = [google_project_service.apis]
}

# ── Firebase Storage bucket (private voice data) ─────────────────────────────
#
# Default Firebase Storage bucket. Created by the Firebase platform but managed
# here for CORS configuration. Stores private per-user voice samples and
# converted audio under paths like:
#   voices/{uid}/{voiceId}/sample.webm
#   voices/{uid}/{voiceId}/conversions/{storyId}.mp3
#
# Access control is via Firebase Security Rules (not IAM), so
# uniform_bucket_level_access is false.

resource "google_storage_bucket" "firebase_storage" {
  name          = "${var.project_id}.firebasestorage.app"
  location      = "US-CENTRAL1"
  project       = var.project_id
  storage_class = "REGIONAL"
  force_destroy = false

  uniform_bucket_level_access = false

  # Required for signed URL audio playback from the web app.
  # Without CORS, browsers block cross-origin <audio> range requests.
  cors {
    origin          = ["https://melostories.com", "https://www.melostories.com", "https://melobooks.com", "https://www.melobooks.com", "https://melo-f5756.web.app"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Content-Length", "Accept-Ranges"]
    max_age_seconds = 3600
  }

  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days
  }

  lifecycle {
    prevent_destroy = true
    # Firebase may update ACLs and metadata — don't fight it.
    ignore_changes = [labels]
  }
}

# ── Terraform state bucket ─────────────────────────────────────────────────────
#
# This bucket stores Terraform remote state. It must be created BEFORE running
# `terraform init` (chicken-and-egg). Create it manually once:
#
#   gcloud storage buckets create gs://melo-f5756-tfstate \
#     --project=melo-f5756 \
#     --location=US \
#     --uniform-bucket-level-access
#
# After the bucket exists, run `terraform init` to configure the backend.
# This resource is here purely for documentation — Terraform cannot manage
# its own state bucket.

# (intentionally not a resource — see comment above)
