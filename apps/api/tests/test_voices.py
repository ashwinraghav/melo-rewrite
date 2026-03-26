"""
Voice feature tests — invites, recording, voice management, and story conversion.
"""
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
from mello_api.services.task_queue import SyncTaskQueue
from mello_api.models.user import UserProfile
from tests.fixtures import STORIES
from tests.conftest import auth


@pytest.fixture
def voice_client():
    repos = create_memory_repositories()
    assert isinstance(repos.stories, MemoryStoryRepository)
    repos.stories.seed(STORIES)
    # Create a user profile for invite owner name lookup
    repos.users.create(UserProfile(
        uid="user-1", email="ash@example.com", display_name="Ash",
        child_age=4, preferred_topics=["park"], created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ))
    embedding = MockEmbeddingService()
    services = Services(
        story_generator=MockStoryGenerator(),
        audio_publisher=MockAudioPublisher(),
        cover_generator=MockCoverGenerator(),
        embedding=embedding,
        search=SearchService(embedding_service=embedding),
        voice_cloner=MockVoiceCloner(),
        catalog_publisher=MockCatalogPublisher(),
        task_queue=SyncTaskQueue(handler=lambda t, p: None),  # placeholder
    )
    app = create_app(repos=repos, services=services)
    test_client = TestClient(app)

    # Wire up SyncTaskQueue to dispatch tasks via the internal endpoint
    def _dispatch(task_type: str, payload: dict) -> None:
        resp = test_client.post(f"/internal/tasks/{task_type}", json=payload)
        assert resp.status_code == 200, f"Task {task_type} failed: {resp.text}"

    services.task_queue._handler = _dispatch

    return test_client


FAKE_AUDIO = b"\x00" * 100_000  # 100KB — well over the 50KB minimum


# ── Auth enforcement ──────────────────────────────────────────────────────────

def test_list_voices_requires_auth(voice_client):
    r = voice_client.get("/v1/voices")
    assert r.status_code == 401


def test_create_invite_requires_auth(voice_client):
    r = voice_client.post("/v1/voices/invite", json={"voiceName": "Grandma", "relationship": "grandparent"})
    assert r.status_code == 401


def test_delete_voice_requires_auth(voice_client):
    r = voice_client.delete("/v1/voices/some-id")
    assert r.status_code == 401


def test_convert_story_requires_auth(voice_client):
    r = voice_client.post("/v1/voices/convert", json={"storyId": "s1", "voiceId": "v1"})
    assert r.status_code == 401


def test_list_conversions_requires_auth(voice_client):
    r = voice_client.get("/v1/voices/conversions/s1")
    assert r.status_code == 401


# ── Invite flow ───────────────────────────────────────────────────────────────

def test_create_invite_returns_token(voice_client):
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma Pat", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert "token" in data
    assert "inviteUrl" in data
    assert data["inviteUrl"].startswith("https://melostories.com/voice?token=")
    assert "expiresAt" in data


def test_get_invite_info_public(voice_client):
    # Create invite
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma Pat", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]

    # Get info — no auth needed
    r = voice_client.get(f"/v1/voices/invite/{token}")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["voiceName"] == "Grandma Pat"
    assert data["relationship"] == "grandparent"
    assert data["ownerDisplayName"] == "Ash"
    assert data["status"] == "pending"


def test_get_invite_info_not_found(voice_client):
    r = voice_client.get("/v1/voices/invite/nonexistent-token")
    assert r.status_code == 404


def test_record_voice_creates_voice(voice_client):
    # Create invite
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma Pat", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]

    # Record — no auth needed, just the token
    r = voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
    )
    assert r.status_code == 202
    data = r.json()["data"]
    assert data["status"] == "processing"
    assert "voiceId" in data

    # SyncTaskQueue dispatched clone-voice synchronously — voice should be ready
    r = voice_client.get("/v1/voices", headers=auth("user-1"))
    voices = r.json()["data"]
    assert len(voices) == 1
    assert voices[0]["name"] == "Grandma Pat"
    assert voices[0]["status"] == "ready"


def test_record_voice_marks_invite_used(voice_client):
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Papa Joe", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]

    # Record
    voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
    )

    # Invite should now be marked used
    r = voice_client.get(f"/v1/voices/invite/{token}")
    assert r.status_code == 400  # "already been used"


def test_record_voice_rejects_used_invite(voice_client):
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]

    # First recording succeeds (202 = accepted for background processing)
    r = voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
    )
    assert r.status_code == 202

    # Second recording with same token fails
    r = voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
    )
    assert r.status_code == 400


def test_record_voice_rejects_short_audio(voice_client):
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]

    r = voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", b"\x00" * 100, "audio/webm")},  # Too short
    )
    assert r.status_code == 400
    assert "too short" in r.json()["detail"].lower()


def test_record_voice_rejects_missing_audio(voice_client):
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]

    r = voice_client.post(f"/v1/voices/invite/{token}/record")
    assert r.status_code == 400


# ── Voice management ──────────────────────────────────────────────────────────

def test_list_voices_empty(voice_client):
    r = voice_client.get("/v1/voices", headers=auth("user-1"))
    assert r.status_code == 200
    assert r.json()["data"] == []
    assert r.json()["total"] == 0


def test_delete_voice(voice_client):
    # Create via invite flow
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]
    r = voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
    )
    voice_id = r.json()["data"]["voiceId"]

    # Delete
    r = voice_client.delete(f"/v1/voices/{voice_id}", headers=auth("user-1"))
    assert r.status_code == 204

    # Should be gone
    r = voice_client.get("/v1/voices", headers=auth("user-1"))
    assert r.json()["total"] == 0


def test_delete_nonexistent_voice(voice_client):
    r = voice_client.delete("/v1/voices/nonexistent", headers=auth("user-1"))
    assert r.status_code == 404


def test_voice_limit_enforced(voice_client):
    for i in range(3):
        r = voice_client.post(
            "/v1/voices/invite",
            json={"voiceName": f"Voice {i}", "relationship": "friend"},
            headers=auth("user-1"),
        )
        token = r.json()["data"]["token"]
        voice_client.post(
            f"/v1/voices/invite/{token}/record",
            files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
        )

    # 4th invite should fail
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Voice 4", "relationship": "friend"},
        headers=auth("user-1"),
    )
    assert r.status_code == 400
    assert "maximum" in r.json()["detail"].lower()


# ── Story conversion ──────────────────────────────────────────────────────────

def _create_voice(voice_client) -> str:
    """Helper: create a voice via the full invite flow and return voiceId."""
    r = voice_client.post(
        "/v1/voices/invite",
        json={"voiceName": "Grandma", "relationship": "grandparent"},
        headers=auth("user-1"),
    )
    token = r.json()["data"]["token"]
    r = voice_client.post(
        f"/v1/voices/invite/{token}/record",
        files={"audio": ("sample.webm", FAKE_AUDIO, "audio/webm")},
    )
    return r.json()["data"]["voiceId"]


def test_convert_story_creates_conversion(voice_client):
    voice_id = _create_voice(voice_client)

    # Pick a published story from fixtures
    r = voice_client.get("/v1/stories", headers=auth("user-1"))
    story_id = r.json()["data"][0]["id"]

    r = voice_client.post(
        "/v1/voices/convert",
        json={"storyId": story_id, "voiceId": voice_id},
        headers=auth("user-1"),
    )
    assert r.status_code == 202
    data = r.json()["data"]
    assert data["status"] == "processing"

    # SyncTaskQueue dispatched convert-story synchronously — check via list endpoint
    r = voice_client.get(f"/v1/voices/conversions/{story_id}", headers=auth("user-1"))
    conv = r.json()["data"][0]
    assert conv["status"] == "ready"
    assert conv["durationSeconds"] >= 0


def test_convert_story_rejects_unready_voice(voice_client):
    r = voice_client.post(
        "/v1/voices/convert",
        json={"storyId": "s1", "voiceId": "nonexistent"},
        headers=auth("user-1"),
    )
    assert r.status_code == 400
    assert "not ready" in r.json()["detail"].lower()


def test_convert_story_rejects_nonexistent_story(voice_client):
    voice_id = _create_voice(voice_client)
    r = voice_client.post(
        "/v1/voices/convert",
        json={"storyId": "nonexistent", "voiceId": voice_id},
        headers=auth("user-1"),
    )
    assert r.status_code == 404


def test_convert_duplicate_fails(voice_client):
    voice_id = _create_voice(voice_client)
    r = voice_client.get("/v1/stories", headers=auth("user-1"))
    story_id = r.json()["data"][0]["id"]

    # First conversion
    r = voice_client.post(
        "/v1/voices/convert",
        json={"storyId": story_id, "voiceId": voice_id},
        headers=auth("user-1"),
    )
    assert r.status_code == 202

    # Duplicate fails
    r = voice_client.post(
        "/v1/voices/convert",
        json={"storyId": story_id, "voiceId": voice_id},
        headers=auth("user-1"),
    )
    assert r.status_code == 400


def test_list_conversions_for_story(voice_client):
    voice_id = _create_voice(voice_client)
    r = voice_client.get("/v1/stories", headers=auth("user-1"))
    story_id = r.json()["data"][0]["id"]

    voice_client.post(
        "/v1/voices/convert",
        json={"storyId": story_id, "voiceId": voice_id},
        headers=auth("user-1"),
    )

    r = voice_client.get(f"/v1/voices/conversions/{story_id}", headers=auth("user-1"))
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) == 1
    assert data[0]["voiceName"] == "Grandma"
    assert data[0]["status"] == "ready"
    assert "audioUrl" in data[0]
