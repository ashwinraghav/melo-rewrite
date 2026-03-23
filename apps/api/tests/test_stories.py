"""
Story endpoint tests.
Covers: auth, listing, filtering (topic/age/duration/combined), signed URLs, 404.
"""
import pytest
from tests.conftest import auth
from tests.fixtures import USER_ALICE


def test_list_requires_auth(client):
    r = client.get("/v1/stories")
    assert r.status_code == 401


def test_get_requires_auth(client):
    r = client.get("/v1/stories/story-animals")
    assert r.status_code == 401


def test_list_returns_only_published(client):
    r = client.get("/v1/stories", headers=auth(USER_ALICE))
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()["data"]]
    assert "story-unpublished" not in ids
    assert len(ids) == 3


def test_filter_by_topic(client):
    r = client.get("/v1/stories?topics=space", headers=auth(USER_ALICE))
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == "story-space"


def test_filter_by_multiple_topics(client):
    r = client.get("/v1/stories?topics=animals,friendship", headers=auth(USER_ALICE))
    assert r.status_code == 200
    ids = {s["id"] for s in r.json()["data"]}
    assert ids == {"story-animals", "story-friendship"}


def test_filter_by_child_age(client):
    # Only story-animals (2-6) matches age 3
    r = client.get("/v1/stories?childAge=3", headers=auth(USER_ALICE))
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()["data"]]
    assert ids == ["story-animals"]


def test_filter_by_duration_short(client):
    r = client.get("/v1/stories?duration=short", headers=auth(USER_ALICE))
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == "story-animals"


def test_filter_by_duration_medium(client):
    r = client.get("/v1/stories?duration=medium", headers=auth(USER_ALICE))
    ids = [s["id"] for s in r.json()["data"]]
    assert ids == ["story-space"]


def test_filter_by_duration_long(client):
    r = client.get("/v1/stories?duration=long", headers=auth(USER_ALICE))
    ids = [s["id"] for s in r.json()["data"]]
    assert ids == ["story-friendship"]


def test_combined_filters(client):
    # age=7 matches space(4-10) and friendship(5-12); topic=space narrows to space only
    r = client.get("/v1/stories?childAge=7&topics=space", headers=auth(USER_ALICE))
    data = r.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == "story-space"


def test_story_response_includes_signed_urls(client):
    r = client.get("/v1/stories", headers=auth(USER_ALICE))
    story = r.json()["data"][0]
    assert "audioUrl" in story
    assert "coverArtUrl" in story
    assert story["audioUrl"].startswith("https://")


def test_get_single_story(client):
    r = client.get("/v1/stories/story-space", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"]["id"] == "story-space"


def test_get_unpublished_story_returns_404(client):
    r = client.get("/v1/stories/story-unpublished", headers=auth(USER_ALICE))
    assert r.status_code == 404


def test_get_nonexistent_story_returns_404(client):
    r = client.get("/v1/stories/does-not-exist", headers=auth(USER_ALICE))
    assert r.status_code == 404
