"""
Voice endpoints — custom voice cloning, invites, and story conversion.

Authenticated:
  GET    /v1/voices                           List user's voices
  POST   /v1/voices/invite                    Create invite link
  DELETE /v1/voices/{voice_id}                Delete a voice
  POST   /v1/voices/convert                   Convert a story to a custom voice
  GET    /v1/voices/conversions/{story_id}    List conversions for a story

Public (token-validated):
  GET    /v1/voices/invite/{token}            Get invite metadata
  POST   /v1/voices/invite/{token}/record     Upload recording, clone voice
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from ..middleware.auth import get_current_user, AuthenticatedUser
from ..models.voice import (
    Voice,
    VoiceInvite,
    Conversion,
    CreateInviteRequest,
    CreateInviteResponse,
    InviteInfoResponse,
    ConvertStoryRequest,
)
from ..repositories.interfaces import Repositories, Services

MAX_VOICES_PER_USER = 3
INVITE_TTL_DAYS = 7
MIN_RECORDING_BYTES = 50_000  # ~30s of audio should be well over 50KB
SITE_URL = "https://melostories.com"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_router(repos: Repositories, services: Services) -> APIRouter:
    router = APIRouter(prefix="/v1/voices")

    # ── Authenticated endpoints ───────────────────────────────────────────

    @router.get("")
    def list_voices(user: AuthenticatedUser = Depends(get_current_user)):
        voices = repos.voices.find_all(user.uid)
        return {"data": [v.model_dump(by_alias=True) for v in voices], "total": len(voices)}

    @router.post("/invite")
    def create_invite(
        body: CreateInviteRequest,
        user: AuthenticatedUser = Depends(get_current_user),
    ):
        if repos.voices.count(user.uid) >= MAX_VOICES_PER_USER:
            raise HTTPException(status_code=400, detail="Maximum 3 voices per account")

        token = uuid.uuid4().hex
        now = _now()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=INVITE_TTL_DAYS)).isoformat()

        # Get owner display name for the invite page greeting
        owner_profile = repos.users.find_by_id(user.uid)
        owner_name = owner_profile.display_name if owner_profile else ""

        invite = VoiceInvite(
            token=token,
            owner_uid=user.uid,
            voice_name=body.voice_name,
            relationship=body.relationship,
            status="pending",
            created_at=now,
            expires_at=expires_at,
        )
        repos.voice_invites.create(invite)

        return {
            "data": CreateInviteResponse(
                token=token,
                invite_url=f"{SITE_URL}/voice?token={token}",
                expires_at=expires_at,
            ).model_dump(by_alias=True)
        }

    @router.delete("/{voice_id}", status_code=204)
    def delete_voice(
        voice_id: str,
        user: AuthenticatedUser = Depends(get_current_user),
    ):
        voice = repos.voices.find_by_id(user.uid, voice_id)
        if not voice:
            raise HTTPException(status_code=404, detail="Voice not found")
        # Best-effort cleanup on ElevenLabs
        if voice.eleven_labs_voice_id:
            try:
                services.voice_cloner.delete_voice(voice.eleven_labs_voice_id)
            except Exception:
                pass
        repos.voices.delete(user.uid, voice_id)

    @router.post("/convert", status_code=202)
    def convert_story(
        body: ConvertStoryRequest,
        user: AuthenticatedUser = Depends(get_current_user),
    ):
        """Enqueue story-to-voice conversion as a background task."""
        voice = repos.voices.find_by_id(user.uid, body.voice_id)
        if not voice or voice.status != "ready":
            raise HTTPException(status_code=400, detail="Voice not ready")

        story = repos.stories.find_by_id(body.story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        existing = repos.conversions.find_by_id(user.uid, body.story_id, body.voice_id)
        if existing and existing.status in ("processing", "ready"):
            raise HTTPException(status_code=400, detail="Conversion already exists")

        now = _now()
        audio_path = f"voices/{user.uid}/{body.voice_id}/conversions/{body.story_id}.mp3"
        conversion = Conversion(
            story_id=body.story_id,
            voice_id=body.voice_id,
            status="processing",
            audio_path=audio_path,
            created_at=now,
            updated_at=now,
        )
        repos.conversions.create(user.uid, conversion)

        services.task_queue.enqueue(
            "convert-story",
            {
                "uid": user.uid,
                "storyId": body.story_id,
                "voiceId": body.voice_id,
                "elevenLabsVoiceId": voice.eleven_labs_voice_id,
                "storyText": story.story_text,
                "audioPath": audio_path,
                "bucketOverride": f"{services.voice_cloner._firebase_bucket}"
                if hasattr(services.voice_cloner, '_firebase_bucket')
                else "melo-f5756.firebasestorage.app",
            },
            dedup_id=f"{body.story_id}-{body.voice_id}",
        )

        return {"data": conversion.model_dump(by_alias=True)}

    @router.get("/conversions/{story_id}")
    def list_conversions(
        story_id: str,
        user: AuthenticatedUser = Depends(get_current_user),
    ):
        conversions = repos.conversions.find_all_for_story(user.uid, story_id)
        voices = {v.id: v for v in repos.voices.find_all(user.uid)}
        result = []
        for c in conversions:
            voice = voices.get(c.voice_id)
            entry = c.model_dump(by_alias=True)
            entry["voiceName"] = voice.name if voice else "Unknown"
            if c.status == "ready" and c.audio_path:
                entry["audioUrl"] = services.voice_cloner.get_download_url(c.audio_path)
            result.append(entry)
        return {"data": result, "total": len(result)}

    # ── Public endpoints (token-validated) ────────────────────────────────

    @router.get("/invite/{token}")
    def get_invite_info(token: str):
        invite = repos.voice_invites.find_by_token(token)
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        if invite.status != "pending":
            raise HTTPException(status_code=400, detail="Invite has already been used")
        if invite.expires_at < _now():
            raise HTTPException(status_code=400, detail="Invite has expired")

        owner = repos.users.find_by_id(invite.owner_uid)
        return {
            "data": InviteInfoResponse(
                voice_name=invite.voice_name,
                relationship=invite.relationship,
                owner_display_name=(owner.display_name or "") if owner else "",
                status=invite.status,
            ).model_dump(by_alias=True)
        }

    @router.post("/invite/{token}/record", status_code=202)
    async def record_voice(token: str, request: Request):
        """Upload recording, start voice cloning as a background task."""
        invite = repos.voice_invites.find_by_token(token)
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        if invite.status != "pending":
            raise HTTPException(status_code=400, detail="Invite has already been used")
        if invite.expires_at < _now():
            raise HTTPException(status_code=400, detail="Invite has expired")
        if repos.voices.count(invite.owner_uid) >= MAX_VOICES_PER_USER:
            raise HTTPException(status_code=400, detail="Voice limit reached for this account")

        form = await request.form()
        audio_file = form.get("audio")
        if not audio_file:
            raise HTTPException(status_code=400, detail="No audio file provided")
        audio_bytes = await audio_file.read()

        if len(audio_bytes) < MIN_RECORDING_BYTES:
            raise HTTPException(
                status_code=400,
                detail="Recording too short. Please record at least 30 seconds.",
            )

        voice_id = uuid.uuid4().hex
        now = _now()

        # Upload sample synchronously (small file, fast)
        sample_path = services.voice_cloner.upload_sample(
            invite.owner_uid, voice_id, audio_bytes,
        )

        # Create voice record as "processing" and mark invite as used
        voice = Voice(
            id=voice_id,
            name=invite.voice_name,
            relationship=invite.relationship,
            status="processing",
            sample_audio_path=sample_path,
            created_at=now,
        )
        repos.voices.create(invite.owner_uid, voice)
        repos.voice_invites.mark_used(token, voice_id)

        # Enqueue cloning as a background task
        services.task_queue.enqueue(
            "clone-voice",
            {
                "ownerUid": invite.owner_uid,
                "voiceId": voice_id,
                "voiceName": invite.voice_name,
                "samplePath": sample_path,
            },
            dedup_id=voice_id,
        )

        return {"data": {"voiceId": voice_id, "status": "processing"}}

    return router
