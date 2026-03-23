"""
Production ASGI entry point: uvicorn mello_api.asgi:app
Initialises Firebase and creates the FastAPI app with Firestore repositories.
"""
import firebase_admin
from .config import config
from .main import create_app
from .repositories.firestore import create_firestore_repositories

firebase_admin.initialize_app(options={"projectId": config.gcp_project_id})

repos = create_firestore_repositories(
    project_id=config.gcp_project_id,
    bucket_name=config.storage_bucket,
    url_ttl_seconds=config.audio_url_ttl_seconds,
)

app = create_app(repos=repos, cors_origins=config.cors_origins)
