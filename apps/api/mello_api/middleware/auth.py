from __future__ import annotations
import os
from dataclasses import dataclass
from fastapi import HTTPException, Header
from typing import Optional


@dataclass
class AuthenticatedUser:
    uid: str
    email: str | None


# Test bypass is ONLY available when ENV != "production"
_ALLOW_TEST_BYPASS = os.environ.get("ENV", "development") != "production"


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_test_uid: Optional[str] = Header(default=None),
    x_test_email: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    """
    FastAPI dependency that resolves the authenticated user.

    Every /v1/* route MUST use this dependency. No exceptions.

    In production: requires a valid Firebase ID token in the Authorization header.
    In tests/dev only: X-Test-Uid header bypasses Firebase verification.
    """
    if _ALLOW_TEST_BYPASS and x_test_uid:
        return AuthenticatedUser(uid=x_test_uid, email=x_test_email)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        import firebase_admin.auth as fb_auth
        decoded = fb_auth.verify_id_token(token)
        return AuthenticatedUser(uid=decoded["uid"], email=decoded.get("email"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
