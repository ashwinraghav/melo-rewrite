"""
Internal task handlers — called by Cloud Tasks, not by users.

POST /internal/tasks/generate-story  { storyId, prompt }
POST /internal/tasks/publish-story   { storyId }
POST /internal/tasks/clone-voice     { ownerUid, voiceId, voiceName, samplePath }
POST /internal/tasks/convert-story   { uid, storyId, voiceId, elevenLabsVoiceId, storyText, audioPath }

Protected by OIDC token validation in production.
In development/test, ENV != production bypasses OIDC.

IMPORTANT: All handlers are sync (def, not async def) because they call
blocking external APIs (Claude, ElevenLabs, Vertex AI). FastAPI runs sync
handlers in a threadpool, keeping the event loop free for other requests.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..models.story import StoryFilters, categorize_duration
from ..repositories.interfaces import Repositories, Services

log = logging.getLogger(__name__)


# ── Request bodies ──────────────────────────────────────────────────────────

class GenerateStoryTask(BaseModel):
    storyId: str
    prompt: str

class PublishStoryTask(BaseModel):
    storyId: str

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

def _verify_internal_request(request: Request) -> None:
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

        claims = id_token.verify_oauth2_token(token, GoogleAuthRequest())
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
    def generate_story_task(
        body: GenerateStoryTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        try:
            generated = services.story_generator.generate(body.prompt)

            repos.stories.update(body.storyId, {
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

            log.info("generate-story completed for %s", body.storyId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("generate-story failed for %s: %s", body.storyId, e)
            repos.stories.update(body.storyId, {
                "generate_status": "failed",
                "generate_error": str(e),
            })
            return {"status": "failed", "detail": str(e)}

    @router.post("/publish-story")
    def publish_story_task(
        body: PublishStoryTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        story = repos.stories.find_by_id_any(body.storyId)
        if story is None:
            log.error("publish-story: story %s not found", body.storyId)
            return {"status": "error", "detail": "Story not found"}

        try:
            repos.stories.update(body.storyId, {"publish_step": "generating_audio"})
            audio_result = services.audio_publisher.publish(body.storyId, story.story_text)

            repos.stories.update(body.storyId, {"publish_step": "creating_cover"})
            cover_path = services.cover_generator.generate_and_upload(
                body.storyId, story.title, story.description, story.topics
            )

            repos.stories.update(body.storyId, {"publish_step": "generating_embedding"})
            embedding = services.embedding.embed_story(story)

            repos.stories.update(body.storyId, {"publish_step": "finalizing"})
            repos.stories.update(body.storyId, {
                "audio_path": audio_result.audio_path,
                "cover_art_path": cover_path,
                "duration_seconds": audio_result.duration_seconds,
                "duration_category": categorize_duration(audio_result.duration_seconds),
                "segments": audio_result.segments,
                "embedding": embedding,
                "is_published": True,
                "publish_status": "ready",
                "publish_step": "",
                "publish_error": "",
            })

            services.search.invalidate()
            all_stories = repos.stories.find_many(StoryFilters())
            services.catalog_publisher.publish_catalog(all_stories)

            log.info("publish-story completed for %s", body.storyId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("publish-story failed for %s: %s", body.storyId, e)
            repos.stories.update(body.storyId, {
                "publish_status": "failed",
                "publish_step": "",
                "publish_error": str(e),
            })
            return {"status": "failed", "detail": str(e)}

    @router.post("/clone-voice")
    def clone_voice_task(
        body: CloneVoiceTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        try:
            audio_bytes = services.voice_cloner.download_sample(body.samplePath)
            result = services.voice_cloner.clone_voice(body.voiceName, audio_bytes)

            repos.voices.update(body.ownerUid, body.voiceId, {
                "eleven_labs_voice_id": result.eleven_labs_voice_id,
                "status": "ready",
            })

            log.info("clone-voice completed for voice %s", body.voiceId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("clone-voice failed for voice %s: %s", body.voiceId, e)
            repos.voices.update(body.ownerUid, body.voiceId, {"status": "failed"})
            return {"status": "failed", "detail": str(e)}

    @router.post("/convert-story")
    def convert_story_task(
        body: ConvertStoryTask,
        _auth: None = Depends(_verify_internal_request),
    ):
        try:
            result = services.audio_publisher.publish(
                body.storyId,
                body.storyText,
                voice_id=body.elevenLabsVoiceId,
                audio_path_override=body.audioPath,
                bucket_override=body.bucketOverride,
            )

            repos.conversions.update(body.uid, body.storyId, body.voiceId, {
                "status": "ready",
                "duration_seconds": result.duration_seconds,
                "segments": result.segments,
            })

            log.info("convert-story completed story=%s voice=%s", body.storyId, body.voiceId)
            return {"status": "ok"}

        except Exception as e:
            log.exception("convert-story failed: %s", e)
            repos.conversions.update(body.uid, body.storyId, body.voiceId, {"status": "failed"})
            return {"status": "failed", "detail": str(e)}

    return router
