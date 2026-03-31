# ── Firebase Auth — Identity Platform config ──────────────────────────────────
#
# Manages authorized domains for Firebase Auth. Setting authDomain to
# melostories.com (same-origin) avoids the cross-origin iframe overhead that
# adds ~300-400ms to every page load.
#
# IMPORT: If this resource doesn't exist in state yet, run:
#   terraform import google_identity_platform_config.auth projects/melo-f5756

resource "google_identity_platform_config" "auth" {
  project = var.project_id

  authorized_domains = [
    "localhost",
    "${var.project_id}.firebaseapp.com",
    "${var.project_id}.web.app",
    "melobooks.com",
    "www.melobooks.com",
    "melostories.com",
    "www.melostories.com",
    "melo-backend--${var.project_id}.us-central1.hosted.app",
  ]

  depends_on = [google_project_service.apis]
}

# ── Firebase Hosting — web frontend (CDN) ─────────────────────────────────────
#
# Uses the DEFAULT Firebase Hosting site (melo-f5756.web.app) which already
# exists. Terraform does NOT manage this resource — it was created when the
# Firebase project was initialised.
#
# Deployment: `firebase deploy --only hosting` (not Terraform).
#
# URL: https://melo-f5756.web.app
# Also: https://melo-f5756.firebaseapp.com
