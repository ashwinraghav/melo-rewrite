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

from ..middleware.auth import get_current_user, AuthenticatedUser
from ..models.story import (
    GenerateStoryRequest,
    GenerateStoryResponse,
    Story,
    StoryFilters,
    StoryWithAudioUrl,
    UpdateDraftRequest,
    categorize_duration,
)
from ..repositories.interfaces import Repositories, Services


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_router(repos: Repositories, services: Services) -> APIRouter:
    router = APIRouter(prefix="/v1/creator")

    def _resolve_story_urls(story: Story) -> StoryWithAudioUrl:
        audio_url = ""
        cover_art_url = ""
        if story.audio_path:
            audio_url = repos.stories.get_audio_signed_url(story.id, story.audio_path)
        if story.cover_art_path:
            cover_art_url = repos.stories.get_cover_art_signed_url(story.id, story.cover_art_path)
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

    @router.post("/generate")
    def generate_story(
        body: GenerateStoryRequest,
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        """Step 1: Generate story text from a prompt. Creates an unpublished draft."""

        generated = services.story_generator.generate(body.prompt)

        story_id = uuid.uuid4().hex
        now = _now()
        story = Story(
            id=story_id,
            title=generated.title,
            description=generated.description,
            duration_seconds=0,
            duration_category="short",
            age_min=generated.age_min,
            age_max=generated.age_max,
            topics=generated.topics,
            audio_path="",
            cover_art_path="",
            story_text=generated.story_text,
            segments=[],
            themes=generated.themes,
            source="user",
            is_published=False,
            created_at=now,
            updated_at=now,
        )
        repos.stories.create(story)

        return {
            "data": GenerateStoryResponse(
                id=story_id,
                title=story.title,
                description=story.description,
                story_text=story.story_text,
                topics=story.topics,
                age_min=story.age_min,
                age_max=story.age_max,
                created_at=story.created_at,
            ).model_dump(by_alias=True)
        }

    @router.patch("/stories/{story_id}")
    def update_draft(
        story_id: str,
        body: UpdateDraftRequest,
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        """Edit a draft story's text/metadata before publishing."""

        story = repos.stories.find_by_id_any(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        if story.is_published:
            raise HTTPException(status_code=400, detail="Cannot edit a published story")

        update_data = {k: v for k, v in body.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        updated = repos.stories.update(story_id, update_data)
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

    @router.post("/stories/{story_id}/publish")
    def publish_story(
        story_id: str,
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        """Step 2: Generate audio + cover art, upload to GCS, publish the story."""

        story = repos.stories.find_by_id_any(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        if story.is_published:
            raise HTTPException(status_code=400, detail="Story is already published")

        # Generate audio with timestamps
        audio_result = services.audio_publisher.publish(story_id, story.story_text)

        # Generate cover art
        cover_path = services.cover_generator.generate_and_upload(
            story_id, story.title, story.description, story.topics
        )

        # Generate embedding for semantic search
        embedding = services.embedding.embed_story(story)

        repos.stories.update(story_id, {
            "audio_path": audio_result.audio_path,
            "cover_art_path": cover_path,
            "duration_seconds": audio_result.duration_seconds,
            "duration_category": categorize_duration(audio_result.duration_seconds),
            "segments": audio_result.segments,
            "embedding": embedding,
            "is_published": True,
        })

        # Invalidate search cache so the new story appears
        services.search.invalidate()

        # Regenerate static catalog JSON so CDN serves the new story
        all_stories = repos.stories.find_many(StoryFilters())
        services.catalog_publisher.publish_catalog(all_stories)

        updated = repos.stories.find_by_id(story_id)
        return {"data": _resolve_story_urls(updated).model_dump(by_alias=True)}

    return router
