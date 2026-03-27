"""
Voice cloning service — ElevenLabs Instant Voice Cloning + Firebase Storage.

ABC interface + production (ElevenLabs) and test (mock) implementations.
"""
from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx
import firebase_admin.storage as fb_storage


@dataclass
class CloneResult:
    eleven_labs_voice_id: str


class VoiceClonerService(ABC):
    @abstractmethod
    async def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult: ...

    @abstractmethod
    async def delete_voice(self, eleven_labs_voice_id: str) -> None: ...

    @abstractmethod
    async def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str: ...

    @abstractmethod
    async def download_sample(self, path: str) -> bytes: ...

    @abstractmethod
    async def get_download_url(self, path: str) -> str: ...


class ElevenLabsVoiceCloner(VoiceClonerService):
    API_BASE = "https://api.elevenlabs.io/v1"

    def __init__(self, api_key: str, firebase_bucket: str) -> None:
        self._firebase_bucket = firebase_bucket
        self._client = httpx.AsyncClient(
            headers={"xi-api-key": api_key},
            timeout=60,
        )

    async def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult:
        resp = await self._client.post(
            f"{self.API_BASE}/voices/add",
            data={
                "name": f"mello-{name}",
                "description": f"Mello custom voice: {name}",
            },
            files={"files": ("sample.webm", audio_bytes, "audio/webm")},
        )
        resp.raise_for_status()
        return CloneResult(eleven_labs_voice_id=resp.json()["voice_id"])

    async def delete_voice(self, eleven_labs_voice_id: str) -> None:
        resp = await self._client.delete(
            f"{self.API_BASE}/voices/{eleven_labs_voice_id}",
        )
        resp.raise_for_status()

    async def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/sample.webm"
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        await asyncio.to_thread(blob.upload_from_string, audio_bytes, "audio/webm")
        return path

    async def upload_conversion(self, uid: str, voice_id: str, story_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/conversions/{story_id}.mp3"
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        await asyncio.to_thread(blob.upload_from_string, audio_bytes, "audio/mpeg")
        return path

    async def download_sample(self, path: str) -> bytes:
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        return await asyncio.to_thread(blob.download_as_bytes)

    async def get_download_url(self, path: str) -> str:
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        await asyncio.to_thread(blob.make_public)
        return blob.public_url


class MockVoiceCloner(VoiceClonerService):
    """Returns canned data for tests — no API calls."""

    async def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult:
        return CloneResult(eleven_labs_voice_id=f"mock-el-{name.lower().replace(' ', '-')}")

    async def delete_voice(self, eleven_labs_voice_id: str) -> None:
        pass

    async def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str:
        return f"voices/{uid}/{voice_id}/sample.webm"

    async def upload_conversion(self, uid: str, voice_id: str, story_id: str, audio_bytes: bytes) -> str:
        return f"voices/{uid}/{voice_id}/conversions/{story_id}.mp3"

    async def download_sample(self, path: str) -> bytes:
        return b"mock-audio-bytes"

    async def get_download_url(self, path: str) -> str:
        return f"https://storage.example.com/{path}"
