"""
Semantic search endpoint.

POST /v1/search — embed query, cosine similarity, Cohere rerank, return playlist.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..middleware.auth import get_current_user, AuthenticatedUser
from ..models.story import (
    SearchStoriesRequest,
    Story,
    StoryFilters,
    StoryWithAudioUrl,
)
from ..repositories.interfaces import Repositories, Services


def make_router(repos: Repositories, services: Services) -> APIRouter:
    router = APIRouter(prefix="/v1")

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
            source=story.source,
            is_published=story.is_published,
            created_at=story.created_at,
            updated_at=story.updated_at,
        )

    @router.post("/search")
    def search_stories(
        body: SearchStoriesRequest,
        _user: AuthenticatedUser = Depends(get_current_user),
    ):
        all_stories = repos.stories.find_many(StoryFilters())

        results = services.search.search(
            query=body.query,
            stories=all_stories,
            child_age=body.child_age,
            limit=body.limit,
        )

        data = [
            {
                **_resolve_story_urls(story).model_dump(by_alias=True),
                "score": round(score, 4),
            }
            for story, score in results
        ]

        return {"data": data, "total": len(data)}

    return router
