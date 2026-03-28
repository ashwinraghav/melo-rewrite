"""
Voice cloning service — ElevenLabs Instant Voice Cloning + Firebase Storage.

ABC interface + production (ElevenLabs) and test (mock) implementations.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx
from gcloud.aio.storage import Storage


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
        self._storage = Storage()

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
        await self._storage.upload(
            self._firebase_bucket, path, audio_bytes,
            content_type="audio/webm",
        )
        return path

    async def upload_conversion(self, uid: str, voice_id: str, story_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/conversions/{story_id}.mp3"
        await self._storage.upload(
            self._firebase_bucket, path, audio_bytes,
            content_type="audio/mpeg",
        )
        return path

    async def download_sample(self, path: str) -> bytes:
        return await self._storage.download(self._firebase_bucket, path)

    async def get_download_url(self, path: str) -> str:
        return f"https://storage.googleapis.com/{self._firebase_bucket}/{path}"


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
