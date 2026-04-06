from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..middleware.auth import get_current_user, AuthenticatedUser
from ..repositories.interfaces import Repositories
from ..models.user import UserProfile, UpdateProfileBody, AcceptTermsBody, CURRENT_TERMS_VERSION
from ..models.story import Story, StoryWithAudioUrl, categorize_duration


class RecordProgressBody(BaseModel):
    progressSeconds: int = Field(ge=0, le=86400)
    completed: bool = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_router(repos: Repositories) -> APIRouter:
    router = APIRouter(prefix="/v1/me")

    async def _ensure_profile(uid: str, email: str | None) -> UserProfile:
        """Return existing profile, creating one on first sign-in."""
        profile = await repos.users.find_by_id(uid)
        if profile is None:
            now = _now()
            profile = await repos.users.create(UserProfile(
                uid=uid,
                email=email or "",
                display_name=None,
                child_age=None,
                preferred_topics=[],
                created_at=now,
                updated_at=now,
            ))
        return profile

    async def _resolve_story_urls(story: Story) -> StoryWithAudioUrl:
        thumb_path = story.cover_art_path.replace("/cover.webp", "/thumb.webp") if story.cover_art_path else ""
        return StoryWithAudioUrl(
            id=story.id,
            title=story.title,
            description=story.description,
            duration_seconds=story.duration_seconds,
            duration_category=story.duration_category,
            age_min=story.age_min,
            age_max=story.age_max,
            topics=story.topics,
            audio_url=await repos.stories.get_audio_public_url(story.audio_path),
            cover_art_url=await repos.stories.get_cover_art_public_url(story.cover_art_path),
            cover_art_thumb_url=await repos.stories.get_cover_art_public_url(thumb_path) if thumb_path else "",
            is_published=story.is_published,
            created_at=story.created_at,
            updated_at=story.updated_at,
        )

    @router.get("")
    async def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
        profile = await _ensure_profile(user.uid, user.email)
        return {"data": profile.model_dump(by_alias=True)}

    @router.patch("")
    async def update_profile(body: UpdateProfileBody, user: AuthenticatedUser = Depends(get_current_user)):
        await _ensure_profile(user.uid, user.email)
        # Only pass fields that were explicitly included in the request body
        update_data = {k: v for k, v in body.model_dump().items() if v is not None or k in body.model_fields_set}
        updated = await repos.users.update(user.uid, update_data)
        return {"data": updated.model_dump(by_alias=True)}

    @router.post("/accept-terms")
    async def accept_terms(body: AcceptTermsBody, user: AuthenticatedUser = Depends(get_current_user)):
        await _ensure_profile(user.uid, user.email)
        if body.terms_version != CURRENT_TERMS_VERSION:
            raise HTTPException(status_code=400, detail=f"Invalid terms version. Current version is {CURRENT_TERMS_VERSION}")
        updated = await repos.users.update(user.uid, {
            "terms_version": body.terms_version,
            "terms_accepted_at": _now(),
        })
        return {"data": updated.model_dump(by_alias=True)}

    # ── Favorites ──────────────────────────────────────────────────────────────

    @router.get("/favorites")
    async def list_favorites(user: AuthenticatedUser = Depends(get_current_user)):
        favorites = await repos.favorites.find_all(user.uid)
        return {"data": [f.model_dump(by_alias=True) for f in favorites], "total": len(favorites), "hasMore": False}

    @router.post("/favorites/{story_id}", status_code=201)
    async def add_favorite(story_id: str, user: AuthenticatedUser = Depends(get_current_user)):
        story = await repos.stories.find_by_id(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        favorite = await repos.favorites.add(user.uid, story_id)
        return {"data": favorite.model_dump(by_alias=True)}

    @router.delete("/favorites/{story_id}", status_code=204)
    async def remove_favorite(story_id: str, user: AuthenticatedUser = Depends(get_current_user)):
        await repos.favorites.remove(user.uid, story_id)

    # ── History ────────────────────────────────────────────────────────────────

    @router.get("/history")
    async def list_history(user: AuthenticatedUser = Depends(get_current_user)):
        entries = await repos.history.find_all(user.uid)
        return {"data": [e.model_dump(by_alias=True) for e in entries], "total": len(entries), "hasMore": False}

    @router.post("/history/{story_id}", status_code=201)
    async def record_progress(
        story_id: str,
        body: RecordProgressBody,
        user: AuthenticatedUser = Depends(get_current_user),
    ):
        story = await repos.stories.find_by_id(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")

        entry = await repos.history.upsert(user.uid, story_id, body.progressSeconds, body.completed)
        return {"data": entry.model_dump(by_alias=True)}

    return router
