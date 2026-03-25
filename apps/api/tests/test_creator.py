"""Tests for the creator endpoints: generate, update draft, publish."""
from tests.conftest import auth


TEST_UID = "creator-001"


# ── Auth ───────────────────────────────────────────────────────────────────

def test_generate_requires_auth(creator_client):
    resp = creator_client.post("/v1/creator/generate", json={"prompt": "a story"})
    assert resp.status_code == 401


def test_publish_requires_auth(creator_client):
    resp = creator_client.post("/v1/creator/stories/fake-id/publish")
    assert resp.status_code == 401


# ── Generate ───────────────────────────────────────────────────────────────

def test_generate_creates_draft(creator_client, repos):
    resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "a story about a gentle breeze in a meadow"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert data["title"] == "The Gentle Breeze"
    assert "storyText" in data
    assert len(data["storyText"]) > 0
    assert isinstance(data["topics"], list)
    assert data["ageMin"] >= 1
    assert data["ageMax"] <= 12

    # Verify it was saved as unpublished
    story = repos.stories.find_by_id_any(data["id"])
    assert story is not None
    assert story.is_published is False


# ── Update draft ───────────────────────────────────────────────────────────

def test_update_draft(creator_client, repos):
    # First generate a story
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    # Update the draft
    resp = creator_client.patch(
        f"/v1/creator/stories/{story_id}",
        json={"title": "Updated Title", "description": "New description"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["title"] == "Updated Title"
    assert resp.json()["data"]["description"] == "New description"


def test_update_published_story_fails(creator_client, repos):
    """Cannot edit a story that has already been published."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    # Publish it
    creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )

    # Try to edit — should fail
    resp = creator_client.patch(
        f"/v1/creator/stories/{story_id}",
        json={"title": "Can't change this"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 400
    assert "published" in resp.json()["detail"].lower()


def test_update_nonexistent_story_fails(creator_client, repos):
    resp = creator_client.patch(
        "/v1/creator/stories/nonexistent",
        json={"title": "Nope"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 404


# ── Publish ────────────────────────────────────────────────────────────────

def test_publish_story(creator_client, repos):
    # Generate
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    # Publish
    resp = creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert data["isPublished"] is True
    assert data["durationSeconds"] > 0
    assert "audioUrl" in data
    assert "coverArtUrl" in data

    # Verify it's now visible in the regular stories endpoint
    story = repos.stories.find_by_id(story_id)
    assert story is not None
    assert story.is_published is True
    assert story.audio_path != ""
    assert story.cover_art_path != ""


def test_publish_already_published_fails(creator_client, repos):
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    # Publish once
    creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )

    # Publish again — should fail
    resp = creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 400
    assert "already published" in resp.json()["detail"].lower()


def test_publish_nonexistent_story_fails(creator_client, repos):
    resp = creator_client.post(
        "/v1/creator/stories/nonexistent/publish",
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 404


# ── Auth (update draft) ──────────────────────────────────────────────────

def test_update_draft_requires_auth(creator_client):
    """PATCH /v1/creator/stories/{id} must require authentication."""
    resp = creator_client.patch(
        "/v1/creator/stories/fake-id",
        json={"title": "Nope"},
    )
    assert resp.status_code == 401


# ── Update draft edge cases ──────────────────────────────────────────────

def test_update_empty_body_fails(creator_client):
    """Sending an update with no changed fields returns 400."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    resp = creator_client.patch(
        f"/v1/creator/stories/{story_id}",
        json={},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 400
    assert "no fields" in resp.json()["detail"].lower()


def test_update_single_field_preserves_others(creator_client, repos):
    """Updating only the title leaves description unchanged."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    data = gen_resp.json()["data"]
    story_id = data["id"]
    original_description = data["description"]

    resp = creator_client.patch(
        f"/v1/creator/stories/{story_id}",
        json={"title": "New Title Only"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["title"] == "New Title Only"

    # Description should be unchanged
    story = repos.stories.find_by_id_any(story_id)
    assert story.description == original_description


# ── Source field ──────────────────────────────────────────────────────────

def test_generated_story_has_user_source(creator_client, repos):
    """Stories created via the creator flow should have source='user'."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    story = repos.stories.find_by_id_any(story_id)
    assert story.source == "user"


def test_published_story_retains_user_source(creator_client, repos):
    """After publishing, the source field should still be 'user'."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    resp = creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["source"] == "user"

    story = repos.stories.find_by_id(story_id)
    assert story.source == "user"


def test_curated_stories_default_to_curated_source(repos):
    """Fixture stories (not from creator) should default to source='curated'."""
    story = repos.stories.find_by_id("the-whispering-pines")
    assert story is not None
    assert story.source == "curated"


# ── Publish side effects ─────────────────────────────────────────────────

def test_publish_generates_segments(creator_client, repos):
    """Published stories should have timed segments for read-along."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )

    story = repos.stories.find_by_id(story_id)
    assert len(story.segments) > 0
    # Segments are stored as camelCase dicts from MockAudioPublisher
    seg = story.segments[0]
    start = seg["startTime"] if isinstance(seg, dict) else seg.start_time
    assert start >= 0


def test_publish_generates_embedding(creator_client, repos):
    """Published stories should have an embedding for semantic search."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )

    story = repos.stories.find_by_id(story_id)
    assert len(story.embedding) > 0


def test_published_story_visible_in_stories_list(creator_client):
    """A published creator story should appear in GET /v1/stories."""
    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "test"},
        headers=auth(TEST_UID),
    )
    story_id = gen_resp.json()["data"]["id"]

    creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth(TEST_UID),
    )

    # Should be visible in the main stories list
    resp = creator_client.get(
        "/v1/stories",
        headers=auth(TEST_UID),
    )
    ids = [s["id"] for s in resp.json()["data"]]
    assert story_id in ids
