"""
Static catalog publisher — generates JSON files for the story catalog
and uploads them to GCS, served via Cloud CDN.

This replaces the dynamic /v1/stories API endpoints for read access.
The web client fetches static JSON from cdn.melostories.com instead of
hitting the API server for every page load.

Generated files:
  catalog/stories.json              — all published stories (list view)
  catalog/stories/{id}.json         — individual story detail (with text + segments)
  catalog/topics/{topic}.json       — stories filtered by topic
"""
from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod

from google.cloud import storage as gcs

from ..models.story import Story, StoryFilters, StorySegment

log = logging.getLogger(__name__)

CDN_HOST = "cdn.melostories.com"


def _story_to_list_item(story: Story, bucket_name: str) -> dict:
    """Convert a Story to the list-view JSON shape (no text/segments)."""
    return {
        "id": story.id,
        "title": story.title,
        "description": story.description,
        "durationSeconds": story.duration_seconds,
        "durationCategory": story.duration_category,
        "ageMin": story.age_min,
        "ageMax": story.age_max,
        "topics": story.topics,
        "audioUrl": f"https://{CDN_HOST}/{story.audio_path}",
        "coverArtUrl": f"https://{CDN_HOST}/{story.cover_art_path}",
        "source": story.source,
        "isPublished": story.is_published,
        "createdAt": story.created_at,
        "updatedAt": story.updated_at,
    }


def _story_to_detail(story: Story, bucket_name: str) -> dict:
    """Convert a Story to the detail-view JSON shape (with text + segments)."""
    item = _story_to_list_item(story, bucket_name)
    item["storyText"] = story.story_text
    item["segments"] = [
        {"text": s.text, "startTime": s.start_time, "endTime": s.end_time}
        for s in story.segments
    ]
    return item


class CatalogPublisherService(ABC):
    @abstractmethod
    def publish_catalog(self, stories: list[Story]) -> int:
        """Regenerate all catalog JSON files. Returns number of files written."""
        ...


class GcsCatalogPublisher(CatalogPublisherService):
    def __init__(self, bucket_name: str, gcp_project_id: str) -> None:
        self._bucket_name = bucket_name
        self._gcs_client = gcs.Client(project=gcp_project_id)

    def _upload_json(self, path: str, data: dict | list) -> None:
        bucket = self._gcs_client.bucket(self._bucket_name)
        blob = bucket.blob(path)
        blob.upload_from_string(
            json.dumps(data, separators=(",", ":")),
            content_type="application/json",
        )
        blob.cache_control = "public, max-age=60, stale-while-revalidate=300"
        blob.patch()

    def publish_catalog(self, stories: list[Story]) -> int:
        published = [s for s in stories if s.is_published]
        files_written = 0

        # 1. Full catalog (list view)
        all_items = [_story_to_list_item(s, self._bucket_name) for s in published]
        self._upload_json("catalog/stories.json", {
            "data": all_items,
            "total": len(all_items),
            "hasMore": False,
        })
        files_written += 1

        # 2. Per-topic lists
        topics: dict[str, list[dict]] = {}
        for story in published:
            for topic in story.topics:
                topics.setdefault(topic, []).append(
                    _story_to_list_item(story, self._bucket_name)
                )
        for topic, items in topics.items():
            self._upload_json(f"catalog/topics/{topic}.json", {
                "data": items,
                "total": len(items),
                "hasMore": False,
            })
            files_written += 1

        # 3. Individual story details
        for story in published:
            detail = _story_to_detail(story, self._bucket_name)
            self._upload_json(f"catalog/stories/{story.id}.json", {
                "data": detail,
            })
            files_written += 1

        log.info("Published catalog: %d files for %d stories", files_written, len(published))
        return files_written


class MockCatalogPublisher(CatalogPublisherService):
    """No-op for tests."""

    def __init__(self) -> None:
        self.last_count = 0

    def publish_catalog(self, stories: list[Story]) -> int:
        self.last_count = len([s for s in stories if s.is_published])
        return self.last_count
