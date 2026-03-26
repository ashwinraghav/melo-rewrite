"""
Voice-related domain models.

Voice: a cloned voice stored under a user's account.
VoiceInvite: a shareable link for someone to record their voice.
Conversion: a story narrated with a custom voice.
"""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

VoiceStatus = Literal["processing", "ready", "failed"]
ConversionStatus = Literal["pending", "processing", "ready", "failed"]
InviteStatus = Literal["pending", "used", "expired"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Voice(CamelModel):
    id: str
    name: str
    relationship: str
    eleven_labs_voice_id: str = ""
    status: VoiceStatus = "processing"
    sample_audio_path: str = ""
    created_at: str = ""


class VoiceInvite(CamelModel):
    token: str
    owner_uid: str
    voice_name: str
    relationship: str
    status: InviteStatus = "pending"
    voice_id: str | None = None
    created_at: str = ""
    expires_at: str = ""


class Conversion(CamelModel):
    story_id: str
    voice_id: str
    status: ConversionStatus = "pending"
    audio_path: str = ""
    duration_seconds: int = 0
    segments: list[dict] = []
    created_at: str = ""
    updated_at: str = ""


# ── Request / Response models ─────────────────────────────────────────────────

class CreateInviteRequest(CamelModel):
    voice_name: str = Field(min_length=1, max_length=100)
    relationship: str = Field(min_length=1, max_length=50)


class CreateInviteResponse(CamelModel):
    token: str
    invite_url: str
    expires_at: str


class InviteInfoResponse(CamelModel):
    voice_name: str
    relationship: str
    owner_display_name: str = ""
    status: InviteStatus = "pending"


class ConvertStoryRequest(CamelModel):
    story_id: str
    voice_id: str
