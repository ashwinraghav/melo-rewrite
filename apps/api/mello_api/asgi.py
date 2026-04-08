"""
Production ASGI entry point: uvicorn mello_api.asgi:app
Initialises logging, OpenTelemetry, Sentry, Firebase, and creates the FastAPI app.
"""
import asyncio
import logging

from .config import config

# 1. Structured logging — must be first, before any getLogger() calls.
from .logging_config import configure_logging
configure_logging()

# 2. OpenTelemetry — must be before Sentry and create_app so auto-instrumentors
#    can hook into FastAPI's constructor and httpx/gRPC clients.
from .telemetry import init_telemetry
init_telemetry()

# 3. Sentry — error capture only. traces_sample_rate=0 because OTel handles tracing.
import sentry_sdk
if config.sentry_dsn:
    sentry_sdk.init(
        dsn=config.sentry_dsn,
        environment=config.env,
        traces_sample_rate=0.0,
        send_default_pii=False,
    )

# 4. Firebase + services + app (unchanged)
import firebase_admin
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
from .services.pronunciation import ClaudePronunciationService

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
        pronunciation=ClaudePronunciationService(api_key=config.anthropic_api_key),
    )

app = create_app(repos=repos, services=services, cors_origins=config.cors_origins)
