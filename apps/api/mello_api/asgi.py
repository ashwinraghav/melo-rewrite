"""
Production ASGI entry point: uvicorn mello_api.asgi:app
Initialises Firebase and creates the FastAPI app with Firestore repositories.
"""
import sentry_sdk
import firebase_admin
from .config import config

# Sentry — must be initialised before the FastAPI app is created.
# The FastAPI integration is auto-discovered; no middleware needed.
if config.sentry_dsn:
    sentry_sdk.init(
        dsn=config.sentry_dsn,
        environment=config.env,
        traces_sample_rate=0.1,
        send_default_pii=False,
        before_send_transaction=lambda event, _hint: (
            None if event.get("transaction") == "/health" else event
        ),
    )
from .main import create_app
from .repositories.firestore import create_firestore_repositories
from .repositories.interfaces import Services
from .services.story_generator import ClaudeStoryGenerator
from .services.audio_publisher import ElevenLabsPublisher
from .services.cover_generator import VertexCoverGenerator
from .services.embedding import VertexEmbeddingService
from .services.search import SearchService
from .services.voice_cloner import ElevenLabsVoiceCloner
from .services.catalog_publisher import GcsCatalogPublisher
from .services.task_queue import CloudTaskQueue

firebase_admin.initialize_app(options={"projectId": config.gcp_project_id})

repos = create_firestore_repositories(
    project_id=config.gcp_project_id,
    bucket_name=config.storage_bucket,
    url_ttl_seconds=config.audio_url_ttl_seconds,
)

services: Services | None = None
if config.anthropic_api_key and config.elevenlabs_api_key:
    services = Services(
        story_generator=ClaudeStoryGenerator(api_key=config.anthropic_api_key),
        audio_publisher=ElevenLabsPublisher(
            api_key=config.elevenlabs_api_key,
            voice_id=config.elevenlabs_voice_id,
            model_id=config.elevenlabs_model_id,
            bucket_name=config.storage_bucket,
            gcp_project_id=config.gcp_project_id,
        ),
        cover_generator=VertexCoverGenerator(
            gcp_project_id=config.gcp_project_id,
            gcp_location="us-central1",
            bucket_name=config.storage_bucket,
        ),
        embedding=VertexEmbeddingService(
            gcp_project_id=config.gcp_project_id,
            gcp_location="us-central1",
        ),
        search=SearchService(
            embedding_service=VertexEmbeddingService(
                gcp_project_id=config.gcp_project_id,
                gcp_location="us-central1",
            ),
            cohere_api_key=config.cohere_api_key,
        ),
        voice_cloner=ElevenLabsVoiceCloner(
            api_key=config.elevenlabs_api_key,
            firebase_bucket=f"{config.gcp_project_id}.firebasestorage.app",
        ),
        catalog_publisher=GcsCatalogPublisher(
            bucket_name=config.storage_bucket,
            gcp_project_id=config.gcp_project_id,
        ),
        task_queue=CloudTaskQueue(
            project_id=config.gcp_project_id,
            location=config.cloud_tasks_location,
            queue_name=config.cloud_tasks_queue,
            service_url=config.service_url,
            service_account_email=f"mello-api@{config.gcp_project_id}.iam.gserviceaccount.com",
        ),
    )

app = create_app(repos=repos, services=services, cors_origins=config.cors_origins)
