# ── Outputs ───────────────────────────────────────────────────────────────────

output "api_url" {
  description = "Public URL of the mello-api Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "web_url" {
  description = "Firebase Hosting URL for the web frontend"
  value       = "https://${var.project_id}.web.app"
}

output "stories_bucket" {
  description = "Name of the Cloud Storage bucket for story content"
  value       = google_storage_bucket.stories.name
}

output "artifact_registry_url" {
  description = "Docker registry URL for pushing images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.mello.repository_id}"
}

output "api_service_account" {
  description = "Email of the API service account"
  value       = google_service_account.api.email
}
