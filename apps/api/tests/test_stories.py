"""
Story endpoint tests.
Covers: auth, listing, filtering (topic/age/duration/combined), signed URLs, 404.
Uses seed data matching the Stitch Editorial Serenity mocks.
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


def test_filter_by_topic(client):
    r = client.get("/v1/stories?topics=space", headers=auth(USER_ALICE))
    assert r.status_code == 200
    ids = {s["id"] for s in r.json()["data"]}
    assert "stardust-journey" in ids
    assert "the-moons-nightcap" in ids


def test_filter_by_multiple_topics(client):
    r = client.get("/v1/stories?topics=animals,magic", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    # animals: sleepy-kittens, bubbles-and-the-deep-blue; magic: the-teacup-dragon
    assert "sleepy-kittens" in ids
    assert "the-teacup-dragon" in ids


def test_filter_by_child_age(client):
    # age=3 matches stories with ageMin<=3<=ageMax
    r = client.get("/v1/stories?childAge=3", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "the-whispering-pines" in ids  # 2-8
    assert "the-moons-nightcap" in ids    # 2-6
    assert "bubbles-and-the-deep-blue" in ids  # 3-8
    assert "the-teacup-dragon" in ids     # 3-9
    assert "sleepy-kittens" in ids        # 2-5


def test_filter_by_duration_short(client):
    r = client.get("/v1/stories?duration=short", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    # short = <= 299s: the-moons-nightcap (300s) is actually medium boundary
    # sleepy-kittens (240s) is short
    assert "sleepy-kittens" in ids


def test_filter_by_duration_medium(client):
    r = client.get("/v1/stories?duration=medium", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "the-whispering-pines" in ids  # 480s
    assert "stardust-journey" in ids       # 720s


def test_filter_by_duration_long(client):
    r = client.get("/v1/stories?duration=long", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert "kind-adventures" in ids  # 900s


def test_combined_filters(client):
    # age=5, topic=space → stardust-journey (4-10,space) + the-moons-nightcap (2-6,space)
    r = client.get("/v1/stories?childAge=5&topics=space", headers=auth(USER_ALICE))
    ids = {s["id"] for s in r.json()["data"]}
    assert ids == {"stardust-journey", "the-moons-nightcap"}


def test_story_response_includes_signed_urls(client):
    r = client.get("/v1/stories", headers=auth(USER_ALICE))
    story = r.json()["data"][0]
    assert "audioUrl" in story
    assert "coverArtUrl" in story
    assert story["audioUrl"].startswith("https://")


def test_get_single_story(client):
    r = client.get("/v1/stories/stardust-journey", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"]["id"] == "stardust-journey"


def test_get_unpublished_story_returns_404(client):
    r = client.get("/v1/stories/story-unpublished", headers=auth(USER_ALICE))
    assert r.status_code == 404


def test_get_nonexistent_story_returns_404(client):
    r = client.get("/v1/stories/does-not-exist", headers=auth(USER_ALICE))
    assert r.status_code == 404
