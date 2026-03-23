import pytest
from fastapi.testclient import TestClient
from mello_api.main import create_app
from mello_api.repositories.memory import create_memory_repositories, MemoryStoryRepository
from tests.fixtures import STORIES


@pytest.fixture
def repos():
    r = create_memory_repositories()
    assert isinstance(r.stories, MemoryStoryRepository)
    r.stories.seed(STORIES)
    return r


@pytest.fixture
def client(repos):
    app = create_app(repos=repos)
    return TestClient(app)


def auth(uid: str, email: str | None = None) -> dict:
    """Return headers that simulate an authenticated user (no Firebase needed)."""
    headers = {"x-test-uid": uid}
    if email:
        headers["x-test-email"] = email
    return headers
