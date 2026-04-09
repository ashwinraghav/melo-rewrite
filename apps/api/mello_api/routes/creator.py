"""
Creator endpoints — story generation and publishing.

POST /v1/creator/generate        Generate story text from a prompt (Claude)
PATCH /v1/creator/stories/{id}   Edit a draft story before publishing
POST /v1/creator/stories/{id}/publish  Generate audio + cover, publish story
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..middleware.auth import require_creator, AuthenticatedUser
from ..config import NARRATOR_VOICES, DEFAULT_NARRATOR_VOICE

from ..models.story import (
    GenerateStoryRequest,
    GenerateStoryResponse,
    PublishStoryRequest,
    Story,
    StoryFilters,
    StoryWithAudioUrl,
    UpdateDraftRequest,
)
from ..repositories.interfaces import Repositories, Services

STALE_PUBLISH_SECONDS = 300  # 5 minutes


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_router(repos: Repositories, services: Services) -> APIRouter:
    router = APIRouter(prefix="/v1/creator")

    async def _resolve_story_urls(story: Story) -> StoryWithAudioUrl:
        audio_url = ""
        cover_art_url = ""
        # Cache-bust with updated_at so republished audio/cover isn't served stale
        cache_bust = f"&v={int(hash(story.updated_at) % 1_000_000)}" if story.updated_at else ""
        if story.audio_path:
            audio_url = await repos.stories.get_audio_signed_url(story.id, story.audio_path) + cache_bust
        if story.cover_art_path:
            cover_art_url = await repos.stories.get_cover_art_signed_url(story.id, story.cover_art_path) + cache_bust
        return StoryWithAudioUrl(
            id=story.id,
            title=story.title,
            description=story.description,
            duration_seconds=story.duration_seconds,
            duration_category=story.duration_category,
            age_min=story.age_min,
            age_max=story.age_max,
            topics=story.topics,
            audio_url=audio_url,
            cover_art_url=cover_art_url,
            story_text=story.story_text,
            segments=story.segments,
            source=story.source,
            is_published=story.is_published,
            created_at=story.created_at,
            updated_at=story.updated_at,
        )

    @router.post("/generate", status_code=202)
    async def generate_story(
        body: GenerateStoryRequest,
        _user: AuthenticatedUser = Depends(require_creator),
    ):
        """Enqueue story generation as a background task. Returns 202 immediately."""

        story_id = uuid.uuid4().hex
        now = _now()

        # Determine age bracket from the user-supplied age
        age_min, age_max = (1, 3) if body.age <= 3 else (3, 6)

        # Create a placeholder story — Claude will fill in content via the task
        story = Story(
            id=story_id,
            owner_uid=_user.uid,
            title="",
            description="",
            duration_seconds=0,
            duration_category="short",
            age_min=age_min,
            age_max=age_max,
            topics=[],
            audio_path="",
            cover_art_path="",
            story_text="",
            segments=[],
            source="user",
            generate_status="processing",
            is_published=False,
            created_at=now,
            updated_at=now,
        )
        await repos.stories.create(story)

        await services.task_queue.enqueue(
            "generate-story",
            {"storyId": story_id, "prompt": body.prompt, "age": body.age},
            dedup_id=story_id,
        )

        return {"data": {"id": story_id, "generateStatus": "processing"}}

    @router.patch("/stories/{story_id}")
    async def update_draft(
        story_id: str,
        body: UpdateDraftRequest,
        _user: AuthenticatedUser = Depends(require_creator),
    ):
        """Edit a story's text/metadata. Works on both drafts and published stories."""

        story = await repos.stories.find_by_id_any(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")

        update_data = {k: v for k, v in body.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        updated = await repos.stories.update(story_id, update_data)
        return {
            "data": GenerateStoryResponse(
                id=updated.id,
                title=updated.title,
                description=updated.description,
                story_text=updated.story_text,
                topics=updated.topics,
                age_min=updated.age_min,
                age_max=updated.age_max,
                created_at=updated.created_at,
            ).model_dump(by_alias=True)
        }

    @router.post("/stories/{story_id}/publish", status_code=202)
    async def publish_story(
        story_id: str,
        body: PublishStoryRequest | None = None,
        _user: AuthenticatedUser = Depends(require_creator),
    ):
        """Enqueue story publishing as a background task. Returns 202 immediately."""

        story = await repos.stories.find_by_id_any(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        # Resolve narrator voice
        voice_key = (body.voice if body else None) or DEFAULT_NARRATOR_VOICE
        if voice_key not in NARRATOR_VOICES:
            raise HTTPException(status_code=400, detail=f"Unknown voice: {voice_key}")

        # If already processing, check if stale (>5 min) — allow retry if so
        if story.publish_status == "processing":
            from datetime import datetime, timezone
            try:
                updated_at = datetime.fromisoformat(story.updated_at)
                age = (datetime.now(timezone.utc) - updated_at).total_seconds()
                if age < STALE_PUBLISH_SECONDS:
                    raise HTTPException(
                        status_code=409,
                        detail="Story is already being published",
                    )
            except (ValueError, TypeError):
                pass

        await repos.stories.update(story_id, {
            "publish_status": "processing",
            "publish_step": "queued",
            "publish_error": "",
        })

        # Re-fetch to get the updated_at from the status change above,
        # ensuring the dedup ID is unique for each publish attempt.
        story = await repos.stories.find_by_id_any(story_id)
        await services.task_queue.enqueue(
            "publish-story",
            {"storyId": story_id, "voiceId": NARRATOR_VOICES[voice_key]},
            dedup_id=f"{story_id}-{hash(story.updated_at) % 10**12}",
        )

        return {"data": {"id": story_id, "publishStatus": "processing"}}

    @router.get("/stories/{story_id}/status")
    async def get_story_status(
        story_id: str,
        _user: AuthenticatedUser = Depends(require_creator),
    ):
        """Poll for generate/publish progress."""
        story = await repos.stories.find_by_id_any(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        result: dict = {
            "generateStatus": story.generate_status,
            "generateError": story.generate_error,
            "publishStatus": story.publish_status,
            "publishStep": story.publish_step,
            "publishError": story.publish_error,
            "isPublished": story.is_published,
        }
        # Include draft content when generation is complete so frontend can populate review
        if story.generate_status == "ready" and story.title:
            result["draft"] = GenerateStoryResponse(
                id=story.id,
                title=story.title,
                description=story.description,
                story_text=story.story_text,
                topics=story.topics,
                age_min=story.age_min,
                age_max=story.age_max,
                created_at=story.created_at,
            ).model_dump(by_alias=True)
        return {"data": result}

    @router.delete("/stories/{story_id}", status_code=204)
    async def delete_story(
        story_id: str,
        _user: AuthenticatedUser = Depends(require_creator),
    ):
        """Delete any story. Creator-only, no ownership check (admin action)."""

        story = await repos.stories.find_by_id_any(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")

        await repos.stories.delete(story_id)

        # Update search index and catalog
        services.search.invalidate()
        all_stories = await repos.stories.find_many(StoryFilters())
        await services.catalog_publisher.publish_catalog(all_stories)

    return router
