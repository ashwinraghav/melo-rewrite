import pytest
import httpx
from httpx import ASGITransport
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
from mello_api.services.task_queue import SyncTaskQueue
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
    # SyncTaskQueue handler is set after the app is created (see creator_client)
    return Services(
        story_generator=MockStoryGenerator(),
        audio_publisher=MockAudioPublisher(),
        cover_generator=MockCoverGenerator(),
        embedding=embedding,
        search=SearchService(embedding_service=embedding),
        voice_cloner=MockVoiceCloner(),
        catalog_publisher=MockCatalogPublisher(),
        task_queue=SyncTaskQueue(handler=_noop_handler),
    )


async def _noop_handler(task_type: str, payload: dict) -> None:
    pass


@pytest.fixture
def client(repos):
    app = create_app(repos=repos)
    return TestClient(app)


@pytest.fixture
def creator_client(repos, services):
    """Client with creator services enabled. SyncTaskQueue dispatches to internal routes."""
    app = create_app(repos=repos, services=services)

    # Use httpx.AsyncClient with ASGITransport for internal task dispatch.
    # This avoids deadlock: the dispatch handler runs inside the event loop
    # (called via await from a route handler), so it must use an async client.
    transport = ASGITransport(app=app)
    async_client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async def _dispatch(task_type: str, payload: dict) -> None:
        resp = await async_client.post(
            f"/internal/tasks/{task_type}",
            json=payload,
        )
        assert resp.status_code == 200, f"Task {task_type} failed: {resp.text}"

    services.task_queue._handler = _dispatch

    return TestClient(app)


@pytest.fixture(autouse=True)
def _strict_async():
    """Convert asyncio slow-callback warnings to errors during tests."""
    import warnings
    with warnings.catch_warnings():
        warnings.filterwarnings("error", message=".*Executing.*took.*seconds")
        yield


def auth(uid: str, email: str | None = None) -> dict:
    """Return headers that simulate an authenticated user (no Firebase needed)."""
    headers = {"x-test-uid": uid}
    if email:
        headers["x-test-email"] = email
    return headers
