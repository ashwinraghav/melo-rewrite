"""Favorites endpoint tests."""
from tests.conftest import auth
from tests.fixtures import USER_ALICE, USER_BOB


def _setup_alice(client):
    client.get("/v1/me", headers=auth(USER_ALICE))


def test_favorites_start_empty(client):
    _setup_alice(client)
    r = client.get("/v1/me/favorites", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"] == []


def test_add_favorite(client):
    _setup_alice(client)
    r = client.post("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))
    assert r.status_code == 201
    assert r.json()["data"]["storyId"] == "the-whispering-pines"


def test_add_favorite_is_idempotent(client):
    _setup_alice(client)
    client.post("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))
    client.post("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))
    r = client.get("/v1/me/favorites", headers=auth(USER_ALICE))
    assert len(r.json()["data"]) == 1


def test_add_favorite_returns_404_for_unpublished(client):
    _setup_alice(client)
    r = client.post("/v1/me/favorites/story-unpublished", headers=auth(USER_ALICE))
    assert r.status_code == 404


def test_remove_favorite(client):
    _setup_alice(client)
    client.post("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))
    r = client.delete("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))
    assert r.status_code == 204
    r2 = client.get("/v1/me/favorites", headers=auth(USER_ALICE))
    assert r2.json()["data"] == []


def test_remove_favorite_noop_if_not_favorited(client):
    _setup_alice(client)
    r = client.delete("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))
    assert r.status_code == 204


def test_favorites_are_user_isolated(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    client.get("/v1/me", headers=auth(USER_BOB))
    client.post("/v1/me/favorites/the-whispering-pines", headers=auth(USER_ALICE))

    r_alice = client.get("/v1/me/favorites", headers=auth(USER_ALICE))
    r_bob = client.get("/v1/me/favorites", headers=auth(USER_BOB))

    assert len(r_alice.json()["data"]) == 1
    assert len(r_bob.json()["data"]) == 0
