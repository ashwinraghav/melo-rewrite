variable "project_id" {
  description = "GCP / Firebase project ID"
  type        = string
  default     = "melo-f5756"
}

variable "project_number" {
  description = "GCP project number (used for service account references)"
  type        = string
  default     = "888632552624"
}

variable "region" {
  description = "Primary GCP region for Cloud Run and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "api_image" {
  description = "Full Artifact Registry image URI for the API service"
  type        = string
  # Example: us-central1-docker.pkg.dev/melo-f5756/mello/api:latest
  # Overridden by CI/CD on each deploy
  default     = "us-docker.pkg.dev/cloudrun/container/hello"  # placeholder until first real build
}

variable "audio_url_ttl_seconds" {
  description = "Signed URL TTL for story audio files (seconds)"
  type        = number
  default     = 900 # 15 minutes
}

variable "cors_origins" {
  description = "Comma-separated CORS origins allowed for the API"
  type        = string
  # Firebase Hosting default + custom domains (comma-separated)
  default     = "https://melo-f5756.web.app,https://melobooks.com,https://www.melobooks.com,https://melostories.com,https://www.melostories.com"
}

# ── Creator service secrets ──────────────────────────────────────────────────

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude story generation"
  type        = string
  sensitive   = true
}

variable "elevenlabs_api_key" {
  description = "ElevenLabs API key for TTS audio generation"
  type        = string
  sensitive   = true
}

variable "elevenlabs_voice_id" {
  description = "ElevenLabs voice ID for story narration"
  type        = string
  default     = "AXdMgz6evoL7OPd7eU12"
}

variable "elevenlabs_model_id" {
  description = "ElevenLabs model ID for TTS"
  type        = string
  default     = "eleven_multilingual_v2"
}
