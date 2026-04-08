"""
Internal task handlers — called by Cloud Tasks, not by users.

POST /internal/tasks/generate-story  { storyId, prompt }
POST /internal/tasks/publish-story   { storyId }
POST /internal/tasks/clone-voice     { ownerUid, voiceId, voiceName, samplePath }
POST /internal/tasks/convert-story   { uid, storyId, voiceId, elevenLabsVoiceId, storyText, audioPath }

Protected by OIDC token validation in production.
In development/test, ENV != production bypasses OIDC.

All handlers are async def — they await async service and repository methods.
"""
from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from opentelemetry import trace
from pydantic import BaseModel

from ..metrics import (
    stories_generated,
    stories_published,
    story_generation_duration,
    story_publish_duration,
    voice_clones_completed,
)
from ..config import ACCENT_LABELS
from ..models.story import StoryFilters, categorize_duration
from ..repositories.interfaces import Repositories, Services

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


# ── Request bodies ──────────────────────────────────────────────────────────

class GenerateStoryTask(BaseModel):
    storyId: str
    prompt: str
    age: int

class PublishStoryTask(BaseModel):
    storyId: str
    voiceId: str | None = None
    accentKey: str | None = None

class CloneVoiceTask(BaseModel):
    ownerUid: str
    voiceId: str
    voiceName: str
    samplePath: str

class ConvertStoryTask(BaseModel):
    uid: str
    storyId: str
    voiceId: str
    elevenLabsVoiceId: str
    storyText: str
    audioPath: str
    bucketOverride: str = "melo-f5756.firebasestorage.app"


# ── OIDC verification ──────────────────────────────────────────────────────

async def _verify_internal_request(request: Request) -> None:
    """Verify the request is from Cloud Tasks (OIDC) or a test environment."""
    from ..config import config
    if config.env != "production":
        return

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing OIDC token")

    token = auth_header[7:]
    try:
        from google.oauth2 import id_token
        from google.auth.transport.requests import Request as GoogleAuthRequest

        claims = await asyncio.to_thread(id_token.verify_oauth2_token, token, GoogleAuthRequest())
        expected_email = f"mello-api@{config.gcp_project_id}.iam.gserviceaccount.com"
        if claims.get("email") != expected_email:
            raise HTTPException(status_code=403, detail="Invalid service account")
    except HTTPException:
        raise
    except Exception as e:
        log.warning("OIDC verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid OIDC token")


def make_router(repos: Repositories, services: Services) -> APIRouter:
    router = APIRouter(prefix="/internal/tasks")

    @router.post("/generate-story")
    async def generate_story_task(
        body: GenerateStoryTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        t0 = time.monotonic()
        try:
            generated = await services.story_generator.generate(body.prompt, body.age)

            await repos.stories.update(body.storyId, {
                "title": generated.title,
                "description": generated.description,
                "story_text": generated.story_text,
                "topics": generated.topics,
                "themes": generated.themes,
                "age_min": generated.age_min,
                "age_max": generated.age_max,
                "generate_status": "ready",
                "generate_error": "",
            })

            story_generation_duration.record(time.monotonic() - t0)
            stories_generated.add(1)
            log.info("generate-story completed for %s", body.storyId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("generate-story failed for %s: %s", body.storyId, e)
            await repos.stories.update(body.storyId, {
                "generate_status": "failed",
                "generate_error": "Story generation failed. Please try again.",
            })
            return {"status": "failed"}

    @router.post("/publish-story")
    async def publish_story_task(
        body: PublishStoryTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        story = await repos.stories.find_by_id_any(body.storyId)
        if story is None:
            log.error("publish-story: story %s not found", body.storyId)
            return {"status": "error", "detail": "Story not found"}

        t0 = time.monotonic()
        try:
            # Generate pronunciation map (non-fatal)
            pron_map: dict[str, str] = {}
            try:
                with tracer.start_as_current_span("publish.pronunciation_map"):
                    accent_key = body.accentKey or "british"
                    accent_label = ACCENT_LABELS.get(accent_key, "British English")
                    pron_map = await services.pronunciation.generate_map(
                        story.story_text, accent_label,
                    )
            except Exception:
                log.warning(
                    "Pronunciation map failed for %s, proceeding without",
                    body.storyId, exc_info=True,
                )

            with tracer.start_as_current_span("publish.generate_audio"):
                await repos.stories.update(body.storyId, {"publish_step": "generating_audio"})
                audio_result = await services.audio_publisher.publish(
                    body.storyId, story.story_text,
                    voice_id=body.voiceId,
                    age_min=story.age_min,
                    pronunciation_map=pron_map or None,
                )

            with tracer.start_as_current_span("publish.create_cover"):
                await repos.stories.update(body.storyId, {"publish_step": "creating_cover"})
                cover_path = await services.cover_generator.generate_and_upload(
                    body.storyId, story.title, story.description, story.topics
                )

            with tracer.start_as_current_span("publish.generate_embedding"):
                await repos.stories.update(body.storyId, {"publish_step": "generating_embedding"})
                embedding = await services.embedding.embed_story(story)

            with tracer.start_as_current_span("publish.finalize"):
                await repos.stories.update(body.storyId, {"publish_step": "finalizing"})
                finalize_data: dict = {
                    "audio_path": audio_result.audio_path,
                    "duration_seconds": audio_result.duration_seconds,
                    "duration_category": categorize_duration(audio_result.duration_seconds),
                    "segments": audio_result.segments,
                    "embedding": embedding,
                    "is_published": True,
                    "publish_status": "ready",
                    "publish_step": "",
                    "publish_error": "",
                }
                if cover_path:
                    finalize_data["cover_art_path"] = cover_path
                await repos.stories.update(body.storyId, finalize_data)

                services.search.invalidate()
                all_stories = await repos.stories.find_many(StoryFilters())
                await services.catalog_publisher.publish_catalog(all_stories)

            story_publish_duration.record(time.monotonic() - t0)
            stories_published.add(1)
            log.info("publish-story completed for %s", body.storyId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("publish-story failed for %s: %s", body.storyId, e)
            await repos.stories.update(body.storyId, {
                "publish_status": "failed",
                "publish_step": "",
                "publish_error": "Story publishing failed. Please try again.",
            })
            return {"status": "failed"}

    @router.post("/clone-voice")
    async def clone_voice_task(
        body: CloneVoiceTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        try:
            audio_bytes = await services.voice_cloner.download_sample(body.samplePath)
            result = await services.voice_cloner.clone_voice(body.voiceName, audio_bytes)

            await repos.voices.update(body.ownerUid, body.voiceId, {
                "eleven_labs_voice_id": result.eleven_labs_voice_id,
                "status": "ready",
            })

            voice_clones_completed.add(1)
            log.info("clone-voice completed for voice %s", body.voiceId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("clone-voice failed for voice %s: %s", body.voiceId, e)
            await repos.voices.update(body.ownerUid, body.voiceId, {"status": "failed"})
            return {"status": "failed"}

    @router.post("/convert-story")
    async def convert_story_task(
        body: ConvertStoryTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        try:
            story = await repos.stories.find_by_id_any(body.storyId)
            age_min = story.age_min if story else None

            result = await services.audio_publisher.publish(
                body.storyId,
                body.storyText,
                voice_id=body.elevenLabsVoiceId,
                audio_path_override=body.audioPath,
                bucket_override=body.bucketOverride,
                age_min=age_min,
            )

            await repos.conversions.update(body.uid, body.storyId, body.voiceId, {
                "status": "ready",
                "duration_seconds": result.duration_seconds,
                "segments": result.segments,
            })

            log.info("convert-story completed story=%s voice=%s", body.storyId, body.voiceId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("convert-story failed: %s", e)
            await repos.conversions.update(body.uid, body.storyId, body.voiceId, {"status": "failed"})
            return {"status": "failed"}

    return router
