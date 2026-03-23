from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..middleware.auth import get_current_user, AuthenticatedUser
from ..repositories.interfaces import Repositories
from ..models.story import StoryFilters, StoryWithAudioUrl, Story, categorize_duration, StoryDuration


def make_router(repos: Repositories) -> APIRouter:
    router = APIRouter(prefix="/v1")

    def resolve_story_urls(story: Story) -> StoryWithAudioUrl:
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

    @router.get("/stories")
    def list_stories(
        topics: Optional[str] = Query(default=None),
        child_age: Optional[int] = Query(default=None, ge=1, le=12, alias="childAge"),
        duration: Optional[StoryDuration] = Query(default=None),
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        filters = StoryFilters(
            topics=[t.strip().lower() for t in topics.split(",")] if topics else None,
            child_age=child_age,
            duration=duration,
        )
        stories = repos.stories.find_many(filters)
        with_urls = [resolve_story_urls(s).model_dump(by_alias=True) for s in stories]
        return {"data": with_urls, "total": len(with_urls), "hasMore": False}

    @router.get("/stories/{story_id}")
    def get_story(
        story_id: str,
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        story = repos.stories.find_by_id(story_id)
        if story is None:
            raise HTTPException(status_code=404, detail="Story not found")
        return {"data": resolve_story_urls(story).model_dump(by_alias=True)}

    return router
