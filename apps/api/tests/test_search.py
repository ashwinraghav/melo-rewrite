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


def test_search_scores_sorted_descending(creator_client):
    """Results should be sorted by relevance score, highest first."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "bedtime stories for sleepy children"},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    if len(data) > 1:
        scores = [s["score"] for s in data]
        assert scores == sorted(scores, reverse=True)


def test_search_scores_have_limited_precision(creator_client):
    """Scores should be rounded to at most 4 decimal places."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "bedtime"},
        headers=auth(TEST_UID),
    )
    data = resp.json()["data"]
    for item in data:
        score_str = str(item["score"])
        if "." in score_str:
            decimals = len(score_str.split(".")[1])
            assert decimals <= 4, f"Score {item['score']} has more than 4 decimal places"


def test_search_limit_one(creator_client):
    """limit=1 should return at most one result."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "nature and parks", "limit": 1},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    assert len(resp.json()["data"]) <= 1


def test_search_child_age_boundary_inclusive(creator_client):
    """A child whose age equals ageMin should still match."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "bedtime", "childAge": 2},
        headers=auth(TEST_UID),
    )
    assert resp.status_code == 200
    # age_min=2 stories should match
    assert len(resp.json()["data"]) > 0


def test_search_results_include_source_field(creator_client):
    """Search results should include the source field."""
    resp = creator_client.post(
        "/v1/search",
        json={"query": "bedtime"},
        headers=auth(TEST_UID),
    )
    data = resp.json()["data"]
    assert len(data) > 0
    # Fixture stories default to curated
    assert data[0]["source"] == "curated"
