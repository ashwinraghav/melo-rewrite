from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    gcp_project_id: str = os.environ.get("GCP_PROJECT_ID", "")
    storage_bucket: str = os.environ.get("STORAGE_BUCKET", "")
    cors_origins: list[str] = [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    ]
    audio_url_ttl_seconds: int = int(os.environ.get("AUDIO_URL_TTL_SECONDS", "900"))
    port: int = int(os.environ.get("PORT", "8080"))
    env: str = os.environ.get("ENV", "development")

    # Creator services
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    elevenlabs_api_key: str = os.environ.get("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_id: str = os.environ.get("ELEVENLABS_VOICE_ID", "AXdMgz6evoL7OPd7eU12")
    elevenlabs_model_id: str = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_v3")

    # Search
    cohere_api_key: str = os.environ.get("COHERE_API_KEY", "")

    # Cloud Tasks
    cloud_tasks_queue: str = os.environ.get("CLOUD_TASKS_QUEUE", "mello-background")
    cloud_tasks_location: str = os.environ.get("CLOUD_TASKS_LOCATION", "us-central1")
    service_url: str = os.environ.get("SERVICE_URL", "http://localhost:8080")

    # Sentry (DSN is a public identifier, not a secret)
    sentry_dsn: str = os.environ.get("SENTRY_DSN", "")


config = Config()

NARRATOR_VOICES: dict[str, str] = {
    "british": "AXdMgz6evoL7OPd7eU12",
    "indian": "2zRM7PkgwBPiau2jvVXc",
    "american": "yj30vwTGJxSHezdAGsv9",
}
DEFAULT_NARRATOR_VOICE = "british"
