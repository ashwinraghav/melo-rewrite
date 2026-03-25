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
