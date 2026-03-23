"""Profile endpoint tests."""
import pytest
from tests.conftest import auth
from tests.fixtures import USER_ALICE, USER_BOB


def test_get_profile_requires_auth(client):
    r = client.get("/v1/me")
    assert r.status_code == 401


def test_get_profile_auto_creates_on_first_signin(client):
    r = client.get("/v1/me", headers=auth(USER_ALICE, "alice@example.com"))
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["uid"] == USER_ALICE
    assert data["email"] == "alice@example.com"
    assert data["childAge"] is None
    assert data["preferredTopics"] == []


def test_get_profile_idempotent(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"]["uid"] == USER_ALICE


def test_update_child_age(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.patch("/v1/me", json={"childAge": 5}, headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"]["childAge"] == 5


def test_update_preferred_topics(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.patch("/v1/me", json={"preferredTopics": ["animals", "space"]}, headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert set(r.json()["data"]["preferredTopics"]) == {"animals", "space"}


def test_partial_update_does_not_clear_other_fields(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    client.patch("/v1/me", json={"childAge": 4}, headers=auth(USER_ALICE))
    client.patch("/v1/me", json={"preferredTopics": ["nature"]}, headers=auth(USER_ALICE))
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    data = r.json()["data"]
    assert data["childAge"] == 4
    assert data["preferredTopics"] == ["nature"]


def test_update_child_age_validation_rejects_out_of_range(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.patch("/v1/me", json={"childAge": 13}, headers=auth(USER_ALICE))
    assert r.status_code == 422


def test_users_are_isolated(client):
    r_alice = client.get("/v1/me", headers=auth(USER_ALICE, "alice@example.com"))
    r_bob = client.get("/v1/me", headers=auth(USER_BOB, "bob@example.com"))
    assert r_alice.json()["data"]["uid"] != r_bob.json()["data"]["uid"]
