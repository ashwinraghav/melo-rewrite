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
    elevenlabs_model_id: str = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")


config = Config()
