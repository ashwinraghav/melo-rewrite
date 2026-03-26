"""
Voice cloning service — ElevenLabs Instant Voice Cloning + Firebase Storage.

ABC interface + production (ElevenLabs) and test (mock) implementations.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import requests
import firebase_admin.storage as fb_storage


@dataclass
class CloneResult:
    eleven_labs_voice_id: str


class VoiceClonerService(ABC):
    @abstractmethod
    def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult: ...

    @abstractmethod
    def delete_voice(self, eleven_labs_voice_id: str) -> None: ...

    @abstractmethod
    def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str: ...

    @abstractmethod
    def download_sample(self, path: str) -> bytes: ...

    @abstractmethod
    def get_download_url(self, path: str) -> str: ...


class ElevenLabsVoiceCloner(VoiceClonerService):
    API_BASE = "https://api.elevenlabs.io/v1"

    def __init__(self, api_key: str, firebase_bucket: str) -> None:
        self._firebase_bucket = firebase_bucket
        self._session = requests.Session()
        self._session.headers.update({"xi-api-key": api_key})

    def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult:
        resp = self._session.post(
            f"{self.API_BASE}/voices/add",
            data={
                "name": f"mello-{name}",
                "description": f"Mello custom voice: {name}",
            },
            files={"files": ("sample.webm", audio_bytes, "audio/webm")},
            timeout=60,
        )
        resp.raise_for_status()
        return CloneResult(eleven_labs_voice_id=resp.json()["voice_id"])

    def delete_voice(self, eleven_labs_voice_id: str) -> None:
        resp = self._session.delete(
            f"{self.API_BASE}/voices/{eleven_labs_voice_id}",
            timeout=30,
        )
        resp.raise_for_status()

    def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/sample.webm"
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        blob.upload_from_string(audio_bytes, content_type="audio/webm")
        return path

    def upload_conversion(self, uid: str, voice_id: str, story_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/conversions/{story_id}.mp3"
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        blob.upload_from_string(audio_bytes, content_type="audio/mpeg")
        return path

    def download_sample(self, path: str) -> bytes:
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        return blob.download_as_bytes()

    def get_download_url(self, path: str) -> str:
        bucket = fb_storage.bucket(self._firebase_bucket)
        blob = bucket.blob(path)
        blob.make_public()
        return blob.public_url


class MockVoiceCloner(VoiceClonerService):
    """Returns canned data for tests — no API calls."""

    def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult:
        return CloneResult(eleven_labs_voice_id=f"mock-el-{name.lower().replace(' ', '-')}")

    def delete_voice(self, eleven_labs_voice_id: str) -> None:
        pass

    def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str:
        return f"voices/{uid}/{voice_id}/sample.webm"

    def upload_conversion(self, uid: str, voice_id: str, story_id: str, audio_bytes: bytes) -> str:
        return f"voices/{uid}/{voice_id}/conversions/{story_id}.mp3"

    def download_sample(self, path: str) -> bytes:
        return b"mock-audio-bytes"

    def get_download_url(self, path: str) -> str:
        return f"https://storage.example.com/{path}"
