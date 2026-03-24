"""
Story endpoint tests.
Uses seed data matching the Stitch topic themes: park, friends, bedtime, food.
"""
from tests.conftest import auth
from tests.fixtures import USER_ALICE


def test_list_requires_auth(client):
    r = client.get("/v1/stories")
    assert r.status_code == 401


def test_get_requires_auth(client):
    r = client.get("/v1/stories/the-whispering-pines")
    assert r.status_code == 401


def test_list_returns_only_published(client):
    r = client.get("/v1/stories", headers=auth(USER_ALICE))
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()["data"]]
    assert "story-unpublished" not in ids
    assert len(ids) == 7


def test_filter_by_topic_park(client):
    r = client.get("/v1/stories?topics=park", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "the-whispering-pines" in ids
    assert "playground-friends" in ids
    assert "picnic-adventure" in ids


def test_filter_by_topic_bedtime(client):
    r = client.get("/v1/stories?topics=bedtime", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "the-moons-nightcap" in ids
    assert "sleepy-bear" in ids


def test_filter_by_child_age(client):
    r = client.get("/v1/stories?childAge=3", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "playground-friends" in ids  # 3-8
    assert "picnic-adventure" in ids    # 3-9


def test_filter_by_duration_short(client):
    # short = <=299s. No stories in seed are under 300s, so result is empty.
    r = client.get("/v1/stories?duration=short", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert len(r.json()["data"]) == 0


def test_filter_by_duration_medium(client):
    r = client.get("/v1/stories?duration=medium", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "the-whispering-pines" in ids  # 480s


def test_filter_by_duration_long(client):
    r = client.get("/v1/stories?duration=long", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "sleepy-bear" in ids  # 900s


def test_combined_filters(client):
    r = client.get("/v1/stories?childAge=4&topics=park", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "the-whispering-pines" in ids  # park, 2-8
    assert "playground-friends" in ids     # park+friends, 3-8


def test_story_response_includes_signed_urls(client):
    r = client.get("/v1/stories", headers=auth(USER_ALICE))
    story = r.json()["data"][0]
    assert "audioUrl" in story
    assert "coverArtUrl" in story
    assert story["audioUrl"].startswith("https://")


def test_get_single_story(client):
    r = client.get("/v1/stories/the-whispering-pines", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"]["id"] == "the-whispering-pines"


def test_get_unpublished_story_returns_404(client):
    r = client.get("/v1/stories/story-unpublished", headers=auth(USER_ALICE))
    assert r.status_code == 404


def test_get_nonexistent_story_returns_404(client):
    r = client.get("/v1/stories/does-not-exist", headers=auth(USER_ALICE))
    assert r.status_code == 404
