"""Profile endpoint tests."""
import asyncio
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


# ── Terms acceptance ────────────────────────────────────────────────────────

def test_accept_terms_requires_auth(client):
    r = client.post("/v1/me/accept-terms", json={"termsVersion": "1.0"})
    assert r.status_code == 401


def test_accept_terms_records_version_and_timestamp(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.post("/v1/me/accept-terms", json={"termsVersion": "1.0"}, headers=auth(USER_ALICE))
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["termsVersion"] == "1.0"
    assert data["termsAcceptedAt"] is not None


def test_accept_terms_persists_on_profile(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    client.post("/v1/me/accept-terms", json={"termsVersion": "1.0"}, headers=auth(USER_ALICE))
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    data = r.json()["data"]
    assert data["termsVersion"] == "1.0"
    assert data["termsAcceptedAt"] is not None


def test_accept_terms_rejects_wrong_version(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.post("/v1/me/accept-terms", json={"termsVersion": "99.0"}, headers=auth(USER_ALICE))
    assert r.status_code == 400


def test_accept_terms_rejects_empty_version(client):
    client.get("/v1/me", headers=auth(USER_ALICE))
    r = client.post("/v1/me/accept-terms", json={"termsVersion": ""}, headers=auth(USER_ALICE))
    assert r.status_code == 422


def test_new_profile_has_null_terms(client):
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    data = r.json()["data"]
    assert data["termsVersion"] is None
    assert data["termsAcceptedAt"] is None


# ── Creator flag ──────────────────────────────────────────────────────────

def test_new_profile_defaults_to_non_creator(client):
    """New profiles should have isCreator: false in the API response."""
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    assert r.status_code == 200
    assert r.json()["data"]["isCreator"] is False


def test_creator_flag_round_trips_through_api(client, repos):
    """Setting is_creator via the repo should be visible in GET /v1/me.

    This catches field naming mismatches (e.g. snake_case 'is_creator'
    vs camelCase 'isCreator' in Firestore) that would cause the flag
    to silently default to false on read.
    """
    # Create profile
    client.get("/v1/me", headers=auth(USER_ALICE))

    # Set creator via repository (simulates what set-creator.py does)
    asyncio.run(repos.users.update(USER_ALICE, {"is_creator": True}))

    # Verify the API returns isCreator: true
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    assert r.json()["data"]["isCreator"] is True


def test_creator_flag_persists_across_profile_updates(client, repos):
    """Updating other profile fields must not reset isCreator."""
    client.get("/v1/me", headers=auth(USER_ALICE))
    asyncio.run(repos.users.update(USER_ALICE, {"is_creator": True}))

    # Update an unrelated field
    client.patch("/v1/me", json={"childAge": 3}, headers=auth(USER_ALICE))

    # isCreator should still be true
    r = client.get("/v1/me", headers=auth(USER_ALICE))
    assert r.json()["data"]["isCreator"] is True
