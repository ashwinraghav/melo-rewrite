import pytest
from fastapi.testclient import TestClient
from mello_api.main import create_app
from mello_api.repositories.interfaces import Services
from mello_api.repositories.memory import create_memory_repositories, MemoryStoryRepository
from mello_api.services.story_generator import MockStoryGenerator
from mello_api.services.audio_publisher import MockAudioPublisher
from mello_api.services.cover_generator import MockCoverGenerator
from mello_api.services.embedding import MockEmbeddingService
from mello_api.services.search import SearchService
from mello_api.services.voice_cloner import MockVoiceCloner
from mello_api.services.catalog_publisher import MockCatalogPublisher
from tests.fixtures import STORIES


@pytest.fixture
def repos():
    r = create_memory_repositories()
    assert isinstance(r.stories, MemoryStoryRepository)
    r.stories.seed(STORIES)
    return r


@pytest.fixture
def services():
    embedding = MockEmbeddingService()
    return Services(
        story_generator=MockStoryGenerator(),
        audio_publisher=MockAudioPublisher(),
        cover_generator=MockCoverGenerator(),
        embedding=embedding,
        search=SearchService(embedding_service=embedding),
        voice_cloner=MockVoiceCloner(),
        catalog_publisher=MockCatalogPublisher(),
    )


@pytest.fixture
def client(repos):
    app = create_app(repos=repos)
    return TestClient(app)


@pytest.fixture
def creator_client(repos, services):
    """Client with creator services enabled."""
    app = create_app(repos=repos, services=services)
    return TestClient(app)


def auth(uid: str, email: str | None = None) -> dict:
    """Return headers that simulate an authenticated user (no Firebase needed)."""
    headers = {"x-test-uid": uid}
    if email:
        headers["x-test-email"] = email
    return headers
