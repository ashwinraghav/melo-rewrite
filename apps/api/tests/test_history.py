"""Listening history endpoint tests."""
from tests.conftest import auth
from tests.fixtures import USER_ALICE, USER_BOB


def _setup_alice(client):
    client.get("/v1/me", headers=auth(USER_ALICE))


def test_history_starts_empty(client):
    _setup_alice(client)
    r = client.get("/v1/me/history", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"] == []


def test_record_progress(client):
    _setup_alice(client)
    r = client.post("/v1/me/history/story-animals", json={"progressSeconds": 60, "completed": False}, headers=auth(USER_ALICE))
    assert r.status_code == 201
    data = r.json()["data"]
    assert data["progressSeconds"] == 60
    assert data["completed"] is False


def test_record_completion(client):
    _setup_alice(client)
    r = client.post("/v1/me/history/story-animals", json={"progressSeconds": 180, "completed": True}, headers=auth(USER_ALICE))
    assert r.json()["data"]["completed"] is True


def test_upsert_overwrites_previous_entry(client):
    """Replaying a story creates one entry, not two."""
    _setup_alice(client)
    client.post("/v1/me/history/story-animals", json={"progressSeconds": 30, "completed": False}, headers=auth(USER_ALICE))
    client.post("/v1/me/history/story-animals", json={"progressSeconds": 180, "completed": True}, headers=auth(USER_ALICE))

    r = client.get("/v1/me/history", headers=auth(USER_ALICE))
    data = r.json()["data"]
    assert len(data) == 1
    assert data[0]["progressSeconds"] == 180
    assert data[0]["completed"] is True


def test_negative_progress_seconds_rejected(client):
    _setup_alice(client)
    r = client.post("/v1/me/history/story-animals", json={"progressSeconds": -1, "completed": False}, headers=auth(USER_ALICE))
    assert r.status_code == 400


def test_history_404_for_unknown_story(client):
    _setup_alice(client)
    r = client.post("/v1/me/history/does-not-exist", json={"progressSeconds": 10, "completed": False}, headers=auth(USER_ALICE))
    assert r.status_code == 404


def test_history_is_user_isolated(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    client.get("/v1/me", headers=auth(USER_BOB))
    client.post("/v1/me/history/story-animals", json={"progressSeconds": 60, "completed": False}, headers=auth(USER_ALICE))

    r_alice = client.get("/v1/me/history", headers=auth(USER_ALICE))
    r_bob = client.get("/v1/me/history", headers=auth(USER_BOB))

    assert len(r_alice.json()["data"]) == 1
    assert len(r_bob.json()["data"]) == 0
