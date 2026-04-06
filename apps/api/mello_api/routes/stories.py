from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..middleware.auth import get_current_user, AuthenticatedUser
from ..repositories.interfaces import Repositories
from ..models.story import StoryFilters, StoryWithAudioUrl, Story, categorize_duration, StoryDuration


def make_router(repos: Repositories) -> APIRouter:
    router = APIRouter(prefix="/v1")

    async def resolve_story_urls(story: Story, include_text: bool = False) -> StoryWithAudioUrl:
        # Derive thumb path from cover path: stories/{id}/cover.webp → stories/{id}/thumb.webp
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
            story_text=story.story_text if include_text else None,
            segments=story.segments if include_text else None,
            source=story.source,
            is_published=story.is_published,
            created_at=story.created_at,
            updated_at=story.updated_at,
        )

    @router.get("/stories")
    async def list_stories(
        topics: Optional[str] = Query(default=None, max_length=200),
        child_age: Optional[int] = Query(default=None, ge=1, le=12, alias="childAge"),
        duration: Optional[StoryDuration] = Query(default=None),
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        topic_list = [t.strip().lower() for t in topics.split(",")][:20] if topics else None
        filters = StoryFilters(
            topics=topic_list,
            child_age=child_age,
            duration=duration,
        )
        stories = await repos.stories.find_many(filters)
        with_urls = [(await resolve_story_urls(s)).model_dump(by_alias=True) for s in stories]
        return {"data": with_urls, "total": len(with_urls), "hasMore": False}

    @router.get("/stories/{story_id}")
    async def get_story(
        story_id: str,
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        story = await repos.stories.find_by_id(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        return {"data": (await resolve_story_urls(story, include_text=True)).model_dump(by_alias=True)}

    return router
