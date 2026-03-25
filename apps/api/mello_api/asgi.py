"""
Production ASGI entry point: uvicorn mello_api.asgi:app
Initialises Firebase and creates the FastAPI app with Firestore repositories.
"""
import firebase_admin
from .config import config
from .main import create_app
from .repositories.firestore import create_firestore_repositories
from .repositories.interfaces import Services
from .services.story_generator import ClaudeStoryGenerator
from .services.audio_publisher import ElevenLabsPublisher
from .services.cover_generator import VertexCoverGenerator
from .services.embedding import VertexEmbeddingService
from .services.search import SearchService

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
    )

app = create_app(repos=repos, services=services, cors_origins=config.cors_origins)
