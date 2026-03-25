"""Tests for the semantic search endpoint: POST /v1/search."""
from tests.conftest import auth

TEST_UID = "search-user"


def test_search_requires_auth(creator_client):
    resp = creator_client.post("/v1/search", json={"query": "bedtime stories"})
    assert resp.status_code == 401


def test_search_returns_results(creator_client):
    resp = creator_client.post(
        "/v1/search",
        json={"query": "sharing toys and jealousy between siblings"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) > 0
    assert "score" in data[0]
    assert data[0]["score"] > 0


def test_search_results_have_story_fields(creator_client):
    resp = creator_client.post(
        "/v1/search",
        json={"query": "bedtime routine"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) > 0
    story = data[0]
    # Should have all StoryWithAudioUrl fields
    assert "id" in story
    assert "title" in story
    assert "audioUrl" in story
    assert "coverArtUrl" in story


def test_search_respects_child_age(creator_client):
    """Stories outside the child's age range should be excluded."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "bedtime", "childAge": 1},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    # All fixture stories have ageMin >= 2, so age=1 should return nothing
    assert len(data) == 0


def test_search_respects_limit(creator_client):
    resp = creator_client.post(
        "/v1/search",
        json={"query": "stories about nature and parks", "limit": 2},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) <= 2


def test_search_excludes_unpublished(creator_client):
    """Unpublished stories should never appear in search results."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "draft story not ready"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    ids = [s["id"] for s in data]
    assert "story-unpublished" not in ids


def test_search_total_matches_data_length(creator_client):
    resp = creator_client.post(
        "/v1/search",
        json={"query": "any story"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == len(body["data"])
