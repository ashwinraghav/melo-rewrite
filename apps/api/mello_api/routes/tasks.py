"""
Internal task handlers — called by Cloud Tasks, not by users.

POST /internal/tasks/publish-story   { storyId }
POST /internal/tasks/clone-voice     { ownerUid, voiceId, voiceName, samplePath }
POST /internal/tasks/convert-story   { uid, storyId, voiceId, elevenLabsVoiceId, storyText, audioPath }

Protected by OIDC token validation in production.
In development/test, ENV != production bypasses OIDC.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from ..models.story import StoryFilters, categorize_duration
from ..repositories.interfaces import Repositories, Services

log = logging.getLogger(__name__)


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
    async def generate_story_task(
        request: Request,
        _auth: None = Depends(_verify_internal_request),
    ):
        body = await request.json()
        story_id = body["storyId"]
        prompt = body["prompt"]

        try:
            generated = services.story_generator.generate(prompt)

            repos.stories.update(story_id, {
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

            log.info("generate-story completed for %s", story_id)
            return {"status": "ok"}

        except Exception as e:
            log.exception("generate-story failed for %s: %s", story_id, e)
            repos.stories.update(story_id, {
                "generate_status": "failed",
                "generate_error": str(e),
            })
            return {"status": "failed", "detail": str(e)}

    @router.post("/publish-story")
    async def publish_story_task(
        request: Request,
        _auth: None = Depends(_verify_internal_request),
    ):
        body = await request.json()
        story_id = body["storyId"]

        story = repos.stories.find_by_id_any(story_id)
        if story is None:
            log.error("publish-story: story %s not found", story_id)
            return {"status": "error", "detail": "Story not found"}

        try:
            repos.stories.update(story_id, {"publish_step": "generating_audio"})
            audio_result = services.audio_publisher.publish(story_id, story.story_text)

            repos.stories.update(story_id, {"publish_step": "creating_cover"})
            cover_path = services.cover_generator.generate_and_upload(
                story_id, story.title, story.description, story.topics
            )

            repos.stories.update(story_id, {"publish_step": "generating_embedding"})
            embedding = services.embedding.embed_story(story)

            repos.stories.update(story_id, {"publish_step": "finalizing"})
            repos.stories.update(story_id, {
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

            log.info("publish-story completed for %s", story_id)
            return {"status": "ok"}

        except Exception as e:
            log.exception("publish-story failed for %s: %s", story_id, e)
            repos.stories.update(story_id, {
                "publish_status": "failed",
                "publish_step": "",
                "publish_error": str(e),
            })
            return {"status": "failed", "detail": str(e)}

    @router.post("/clone-voice")
    async def clone_voice_task(
        request: Request,
        _auth: None = Depends(_verify_internal_request),
    ):
        body = await request.json()
        owner_uid = body["ownerUid"]
        voice_id = body["voiceId"]
        voice_name = body["voiceName"]
        sample_path = body["samplePath"]

        try:
            audio_bytes = services.voice_cloner.download_sample(sample_path)
            result = services.voice_cloner.clone_voice(voice_name, audio_bytes)

            repos.voices.update(owner_uid, voice_id, {
                "eleven_labs_voice_id": result.eleven_labs_voice_id,
                "status": "ready",
            })

            log.info("clone-voice completed for voice %s", voice_id)
            return {"status": "ok"}

        except Exception as e:
            log.exception("clone-voice failed for voice %s: %s", voice_id, e)
            repos.voices.update(owner_uid, voice_id, {"status": "failed"})
            return {"status": "failed", "detail": str(e)}

    @router.post("/convert-story")
    async def convert_story_task(
        request: Request,
        _auth: None = Depends(_verify_internal_request),
    ):
        body = await request.json()
        uid = body["uid"]
        story_id = body["storyId"]
        voice_id = body["voiceId"]
        eleven_labs_voice_id = body["elevenLabsVoiceId"]
        story_text = body["storyText"]
        audio_path = body["audioPath"]
        bucket_override = body.get("bucketOverride", "melo-f5756.firebasestorage.app")

        try:
            result = services.audio_publisher.publish(
                story_id,
                story_text,
                voice_id=eleven_labs_voice_id,
                audio_path_override=audio_path,
                bucket_override=bucket_override,
            )

            repos.conversions.update(uid, story_id, voice_id, {
                "status": "ready",
                "duration_seconds": result.duration_seconds,
                "segments": result.segments,
            })

            log.info("convert-story completed story=%s voice=%s", story_id, voice_id)
            return {"status": "ok"}

        except Exception as e:
            log.exception("convert-story failed: %s", e)
            repos.conversions.update(uid, story_id, voice_id, {"status": "failed"})
            return {"status": "failed", "detail": str(e)}

    return router
