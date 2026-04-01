"""
Voice cloning service — ElevenLabs Instant Voice Cloning + Firebase Storage.

ABC interface + production (ElevenLabs) and test (mock) implementations.
"""
from __future__ import annotations

import asyncio
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta

import google.auth
import httpx
from gcloud.aio.storage import Storage
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.cloud import storage as gcs_sync
from google.oauth2.service_account import Credentials as SACredentials
from opentelemetry import trace

from ..metrics import (
    gcs_operation_duration, gcs_errors,
    elevenlabs_request_duration, elevenlabs_errors,
)

tracer = trace.get_tracer(__name__)


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
        # Signed URL support — same pattern as FirestoreStoryRepository
        self._gcs_client = gcs_sync.Client()
        self._url_ttl_seconds = 900  # 15 minutes
        credentials, _ = google.auth.default()
        self._credentials = credentials
        self._sa_email: str | None = None
        if not isinstance(credentials, SACredentials):
            try:
                credentials.refresh(GoogleAuthRequest())
                self._sa_email = credentials.service_account_email
            except (AttributeError, Exception):
                pass  # Local dev ADC — signed URLs won't work

    async def clone_voice(self, name: str, audio_bytes: bytes) -> CloneResult:
        with tracer.start_as_current_span(
            "elevenlabs.clone_voice",
            attributes={
                "elevenlabs.operation": "clone_voice",
                "elevenlabs.audio_bytes": len(audio_bytes),
            },
        ) as span:
            t0 = time.monotonic()
            try:
                resp = await self._client.post(
                    f"{self.API_BASE}/voices/add",
                    data={
                        "name": f"mello-{name}",
                        "description": f"Mello custom voice: {name}",
                    },
                    files={"files": ("sample.webm", audio_bytes, "audio/webm")},
                )
                resp.raise_for_status()
                elevenlabs_request_duration.record(
                    time.monotonic() - t0, {"operation": "clone_voice"}
                )
                return CloneResult(eleven_labs_voice_id=resp.json()["voice_id"])
            except Exception as e:
                elevenlabs_errors.add(1, {"operation": "clone_voice"})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    async def delete_voice(self, eleven_labs_voice_id: str) -> None:
        with tracer.start_as_current_span(
            "elevenlabs.delete_voice",
            attributes={"elevenlabs.operation": "delete_voice"},
        ) as span:
            t0 = time.monotonic()
            try:
                resp = await self._client.delete(
                    f"{self.API_BASE}/voices/{eleven_labs_voice_id}",
                )
                resp.raise_for_status()
                elevenlabs_request_duration.record(
                    time.monotonic() - t0, {"operation": "delete_voice"}
                )
            except Exception as e:
                elevenlabs_errors.add(1, {"operation": "delete_voice"})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    async def upload_sample(self, uid: str, voice_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/sample.webm"
        with tracer.start_as_current_span(
            "gcs.upload",
            attributes={
                "gcs.bucket": self._firebase_bucket,
                "gcs.path": path,
                "gcs.operation": "upload",
                "gcs.bytes": len(audio_bytes),
            },
        ) as span:
            t0 = time.monotonic()
            try:
                await self._storage.upload(
                    self._firebase_bucket, path, audio_bytes,
                    content_type="audio/webm",
                )
                gcs_operation_duration.record(
                    time.monotonic() - t0,
                    {"operation": "upload", "bucket": self._firebase_bucket},
                )
            except Exception as e:
                gcs_errors.add(1, {"operation": "upload", "bucket": self._firebase_bucket})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise
        return path

    async def upload_conversion(self, uid: str, voice_id: str, story_id: str, audio_bytes: bytes) -> str:
        path = f"voices/{uid}/{voice_id}/conversions/{story_id}.mp3"
        with tracer.start_as_current_span(
            "gcs.upload",
            attributes={
                "gcs.bucket": self._firebase_bucket,
                "gcs.path": path,
                "gcs.operation": "upload",
                "gcs.bytes": len(audio_bytes),
            },
        ) as span:
            t0 = time.monotonic()
            try:
                await self._storage.upload(
                    self._firebase_bucket, path, audio_bytes,
                    content_type="audio/mpeg",
                )
                gcs_operation_duration.record(
                    time.monotonic() - t0,
                    {"operation": "upload", "bucket": self._firebase_bucket},
                )
            except Exception as e:
                gcs_errors.add(1, {"operation": "upload", "bucket": self._firebase_bucket})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise
        return path

    async def download_sample(self, path: str) -> bytes:
        with tracer.start_as_current_span(
            "gcs.download",
            attributes={
                "gcs.bucket": self._firebase_bucket,
                "gcs.path": path,
                "gcs.operation": "download",
            },
        ) as span:
            t0 = time.monotonic()
            try:
                data = await self._storage.download(self._firebase_bucket, path)
                gcs_operation_duration.record(
                    time.monotonic() - t0,
                    {"operation": "download", "bucket": self._firebase_bucket},
                )
                span.set_attribute("gcs.bytes", len(data))
                return data
            except Exception as e:
                gcs_errors.add(1, {"operation": "download", "bucket": self._firebase_bucket})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    def _signed_url_sync(self, path: str) -> str:
        """Synchronous signed URL generation — called via asyncio.to_thread."""
        blob = self._gcs_client.bucket(self._firebase_bucket).blob(path)
        expiration = timedelta(seconds=self._url_ttl_seconds)
        if isinstance(self._credentials, SACredentials):
            return blob.generate_signed_url(version="v4", expiration=expiration, method="GET")
        else:
            if not self._credentials.token or not self._credentials.valid:
                self._credentials.refresh(GoogleAuthRequest())
            return blob.generate_signed_url(
                version="v4",
                expiration=expiration,
                method="GET",
                service_account_email=self._sa_email,
                access_token=self._credentials.token,
            )

    async def get_download_url(self, path: str) -> str:
        return await asyncio.to_thread(self._signed_url_sync, path)


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
