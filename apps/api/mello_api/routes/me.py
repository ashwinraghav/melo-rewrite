from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from ..middleware.auth import get_current_user, AuthenticatedUser
from ..repositories.interfaces import Repositories
from ..models.user import UserProfile, UpdateProfileBody
from ..models.story import Story, StoryWithAudioUrl, categorize_duration


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_router(repos: Repositories) -> APIRouter:
    router = APIRouter(prefix="/v1/me")

    def _ensure_profile(uid: str, email: str | None) -> UserProfile:
        """Return existing profile, creating one on first sign-in."""
        profile = repos.users.find_by_id(uid)
        if profile is None:
            now = _now()
            profile = repos.users.create(UserProfile(
                uid=uid,
                email=email or "",
                display_name=None,
                child_age=None,
                preferred_topics=[],
                created_at=now,
                updated_at=now,
            ))
        return profile

    def _resolve_story_urls(story: Story) -> StoryWithAudioUrl:
        return StoryWithAudioUrl(
            id=story.id,
            title=story.title,
            description=story.description,
            duration_seconds=story.duration_seconds,
            duration_category=story.duration_category,
            age_min=story.age_min,
            age_max=story.age_max,
            topics=story.topics,
            audio_url=repos.stories.get_audio_signed_url(story.id, story.audio_path),
            cover_art_url=repos.stories.get_cover_art_signed_url(story.id, story.cover_art_path),
            is_published=story.is_published,
            created_at=story.created_at,
            updated_at=story.updated_at,
        )

    @router.get("")
    def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
        profile = _ensure_profile(user.uid, user.email)
        return {"data": profile.model_dump(by_alias=True)}

    @router.patch("")
    def update_profile(body: UpdateProfileBody, user: AuthenticatedUser = Depends(get_current_user)):
        _ensure_profile(user.uid, user.email)
        # Only pass fields that were explicitly included in the request body
        update_data = {k: v for k, v in body.model_dump().items() if v is not None or k in body.model_fields_set}
        updated = repos.users.update(user.uid, update_data)
        return {"data": updated.model_dump(by_alias=True)}

    # ── Favorites ──────────────────────────────────────────────────────────────

    @router.get("/favorites")
    def list_favorites(user: AuthenticatedUser = Depends(get_current_user)):
        favorites = repos.favorites.find_all(user.uid)
        return {"data": [f.model_dump(by_alias=True) for f in favorites], "total": len(favorites), "hasMore": False}

    @router.post("/favorites/{story_id}", status_code=201)
    def add_favorite(story_id: str, user: AuthenticatedUser = Depends(get_current_user)):
        story = repos.stories.find_by_id(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        favorite = repos.favorites.add(user.uid, story_id)
        return {"data": favorite.model_dump(by_alias=True)}

    @router.delete("/favorites/{story_id}", status_code=204)
    def remove_favorite(story_id: str, user: AuthenticatedUser = Depends(get_current_user)):
        repos.favorites.remove(user.uid, story_id)

    # ── History ────────────────────────────────────────────────────────────────

    @router.get("/history")
    def list_history(user: AuthenticatedUser = Depends(get_current_user)):
        entries = repos.history.find_all(user.uid)
        return {"data": [e.model_dump(by_alias=True) for e in entries], "total": len(entries), "hasMore": False}

    @router.post("/history/{story_id}", status_code=201)
    def record_progress(
        story_id: str,
        body: dict,
        user: AuthenticatedUser = Depends(get_current_user),
    ):
        story = repos.stories.find_by_id(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")

        progress_seconds = body.get("progressSeconds")
        completed = body.get("completed", False)

        if not isinstance(progress_seconds, (int, float)) or progress_seconds < 0:
            raise HTTPException(status_code=400, detail="progressSeconds must be a non-negative number")

        entry = repos.history.upsert(user.uid, story_id, int(progress_seconds), bool(completed))
        return {"data": entry.model_dump(by_alias=True)}

    return router
