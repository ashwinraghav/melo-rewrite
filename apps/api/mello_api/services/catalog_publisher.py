"""
Static catalog publisher — generates JSON files for the story catalog
and uploads them to GCS, served via Cloud CDN.

Generated files:
  catalog/stories.json              — all published stories (list view)
  catalog/stories/{id}.json         — individual story detail (with text + segments)
  catalog/topics/{topic}.json       — stories filtered by topic
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod

from gcloud.aio.storage import Storage
from opentelemetry import trace

from ..metrics import gcs_operation_duration, gcs_errors
from ..models.story import Story, StoryFilters, StorySegment

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

CDN_HOST = "cdn.melostories.com"

CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300"


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
    async def publish_catalog(self, stories: list[Story]) -> int:
        """Regenerate all catalog JSON files. Returns number of files written."""
        ...


class GcsCatalogPublisher(CatalogPublisherService):
    def __init__(self, bucket_name: str, gcp_project_id: str) -> None:
        self._bucket_name = bucket_name
        self._storage = Storage()

    async def _upload_json(self, path: str, data: dict | list) -> None:
        content = json.dumps(data, separators=(",", ":")).encode()
        with tracer.start_as_current_span(
            "gcs.upload",
            attributes={
                "gcs.bucket": self._bucket_name,
                "gcs.path": path,
                "gcs.operation": "upload",
                "gcs.bytes": len(content),
            },
        ) as span:
            t0 = time.monotonic()
            try:
                await self._storage.upload(
                    self._bucket_name, path, content,
                    content_type="application/json",
                    metadata={"cacheControl": CACHE_CONTROL},
                )
                gcs_operation_duration.record(
                    time.monotonic() - t0,
                    {"operation": "upload", "bucket": self._bucket_name},
                )
            except Exception as e:
                gcs_errors.add(1, {"operation": "upload", "bucket": self._bucket_name})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    async def publish_catalog(self, stories: list[Story]) -> int:
        published = [s for s in stories if s.is_published]
        uploads = []

        # 1. Full catalog (list view)
        all_items = [_story_to_list_item(s, self._bucket_name) for s in published]
        uploads.append(self._upload_json("catalog/stories.json", {
            "data": all_items,
            "total": len(all_items),
            "hasMore": False,
        }))

        # 2. Per-topic lists
        topics: dict[str, list[dict]] = {}
        for story in published:
            for topic in story.topics:
                topics.setdefault(topic, []).append(
                    _story_to_list_item(story, self._bucket_name)
                )
        for topic, items in topics.items():
            uploads.append(self._upload_json(f"catalog/topics/{topic}.json", {
                "data": items,
                "total": len(items),
                "hasMore": False,
            }))

        # 3. Individual story details
        for story in published:
            detail = _story_to_detail(story, self._bucket_name)
            uploads.append(self._upload_json(f"catalog/stories/{story.id}.json", {
                "data": detail,
            }))

        await asyncio.gather(*uploads)
        files_written = len(uploads)

        log.info("Published catalog: %d files for %d stories", files_written, len(published))
        return files_written


class MockCatalogPublisher(CatalogPublisherService):
    """No-op for tests."""

    def __init__(self) -> None:
        self.last_count = 0

    async def publish_catalog(self, stories: list[Story]) -> int:
        self.last_count = len([s for s in stories if s.is_published])
        return self.last_count
