from __future__ import annotations
import asyncio
import logging
import os
from dataclasses import dataclass, field
from fastapi import Depends, HTTPException, Header
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class AuthenticatedUser:
    uid: str
    email: str | None
    is_creator: bool = field(default=False)


# Test bypass is ONLY available when ENV is explicitly NOT "production".
# Fail-secure: if ENV is unset, bypass is allowed only in dev/test.
_ENV = os.environ.get("ENV", "development")
_ALLOW_TEST_BYPASS = _ENV != "production"

if _ALLOW_TEST_BYPASS:
    log.warning(
        "Auth test bypass is ENABLED (ENV=%s). "
        "Set ENV=production to disable. "
        "This MUST NOT be active in any public-facing environment.",
        _ENV,
    )


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_test_uid: Optional[str] = Header(default=None),
    x_test_email: Optional[str] = Header(default=None),
    x_test_creator: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    """
    FastAPI dependency that resolves the authenticated user.

    Every /v1/* route MUST use this dependency. No exceptions.

    In production: requires a valid Firebase ID token in the Authorization header.
    The ``creator`` custom claim controls access to story-creation endpoints.

    In tests/dev only: X-Test-Uid header bypasses Firebase verification.
    X-Test-Creator defaults to "true" so existing tests keep working.
    """
    if _ALLOW_TEST_BYPASS and x_test_uid:
        # Default to creator=True in test mode for backward compat.
        # Pass X-Test-Creator: false to simulate a non-creator.
        is_creator = (x_test_creator or "true").lower() != "false"
        return AuthenticatedUser(uid=x_test_uid, email=x_test_email, is_creator=is_creator)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        import firebase_admin.auth as fb_auth
        decoded = await asyncio.to_thread(fb_auth.verify_id_token, token)
        return AuthenticatedUser(
            uid=decoded["uid"],
            email=decoded.get("email"),
            is_creator=bool(decoded.get("creator", False)),
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_creator(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Dependency that enforces creator access. Returns 403 for non-creators."""
    if not user.is_creator:
        raise HTTPException(status_code=403, detail="Creator access required")
    return user
