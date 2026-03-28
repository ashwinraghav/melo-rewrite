"""
Audio publishing service — ElevenLabs TTS + GCS upload.

ABC interface + production (ElevenLabs) and test (mock) implementations.
"""
from __future__ import annotations

import base64
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import httpx
from gcloud.aio.storage import Storage
from opentelemetry import trace

from ..metrics import (
    gcs_operation_duration, gcs_errors,
    elevenlabs_request_duration, elevenlabs_errors,
)

tracer = trace.get_tracer(__name__)


@dataclass
class PublishResult:
    audio_path: str
    duration_seconds: int
    segments: list[dict] = field(default_factory=list)


class AudioPublisherService(ABC):
    @abstractmethod
    async def publish(
        self,
        story_id: str,
        story_text: str,
        voice_id: str | None = None,
        audio_path_override: str | None = None,
        bucket_override: str | None = None,
    ) -> PublishResult: ...


class ElevenLabsPublisher(AudioPublisherService):
    API_BASE = "https://api.elevenlabs.io/v1"

    def __init__(
        self,
        api_key: str,
        voice_id: str,
        model_id: str,
        bucket_name: str,
        gcp_project_id: str,
    ) -> None:
        self._voice_id = voice_id
        self._model_id = model_id
        self._bucket_name = bucket_name
        self._client = httpx.AsyncClient(
            headers={"xi-api-key": api_key},
            timeout=120,
        )
        self._storage = Storage()

    async def _generate_with_timestamps(self, text: str, voice_id: str | None = None) -> dict:
        vid = voice_id or self._voice_id
        with tracer.start_as_current_span(
            "elevenlabs.tts",
            attributes={
                "elevenlabs.operation": "text_to_speech",
                "elevenlabs.voice_id": vid,
                "elevenlabs.model_id": self._model_id,
                "elevenlabs.text_length": len(text),
            },
        ) as span:
            t0 = time.monotonic()
            try:
                resp = await self._client.post(
                    f"{self.API_BASE}/text-to-speech/{vid}/with-timestamps",
                    headers={"Content-Type": "application/json"},
                    json={
                        "text": text,
                        "model_id": self._model_id,
                        "voice_settings": {
                            "stability": 0.75,
                            "similarity_boost": 0.75,
                            "style": 0.3,
                            "use_speaker_boost": True,
                        },
                    },
                )
                resp.raise_for_status()
                elevenlabs_request_duration.record(
                    time.monotonic() - t0, {"operation": "tts"}
                )
                return resp.json()
            except Exception as e:
                elevenlabs_errors.add(1, {"operation": "tts"})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    @staticmethod
    def _chars_to_sentence_segments(text: str, alignment: dict) -> list[dict]:
        """Convert character-level timestamps to sentence-level segments."""
        chars = alignment["characters"]
        starts = alignment["character_start_times_seconds"]
        ends = alignment["character_end_times_seconds"]

        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        segments: list[dict] = []
        char_offset = 0

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            sent_start = None
            sent_end = None
            sent_char_count = len(sentence)
            search_end = min(char_offset + sent_char_count + 10, len(chars))

            for i in range(char_offset, min(search_end, len(starts))):
                if starts[i] > 0 or i == char_offset:
                    if sent_start is None:
                        sent_start = starts[i]
                sent_end = ends[i]

            char_offset += sent_char_count
            while char_offset < len(chars) and chars[char_offset] in (' ', '\n', '\t'):
                char_offset += 1

            if sent_start is not None and sent_end is not None:
                segments.append({
                    "text": sentence,
                    "startTime": round(sent_start, 2),
                    "endTime": round(sent_end, 2),
                })

        return segments

    async def _upload_audio(
        self, story_id: str, audio_bytes: bytes,
        path_override: str | None = None, bucket_override: str | None = None,
    ) -> str:
        gcs_path = path_override or f"stories/{story_id}/audio.mp3"
        bucket_name = bucket_override or self._bucket_name
        with tracer.start_as_current_span(
            "gcs.upload",
            attributes={
                "gcs.bucket": bucket_name,
                "gcs.path": gcs_path,
                "gcs.operation": "upload",
                "gcs.bytes": len(audio_bytes),
            },
        ) as span:
            t0 = time.monotonic()
            try:
                await self._storage.upload(
                    bucket_name, gcs_path, audio_bytes,
                    content_type="audio/mpeg",
                )
                gcs_operation_duration.record(
                    time.monotonic() - t0,
                    {"operation": "upload", "bucket": bucket_name},
                )
            except Exception as e:
                gcs_errors.add(1, {"operation": "upload", "bucket": bucket_name})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise
        return gcs_path

    async def publish(
        self,
        story_id: str,
        story_text: str,
        voice_id: str | None = None,
        audio_path_override: str | None = None,
        bucket_override: str | None = None,
    ) -> PublishResult:
        result = await self._generate_with_timestamps(story_text, voice_id=voice_id)

        audio_bytes = base64.b64decode(result["audio_base64"])
        alignment = result["alignment"]

        if alignment["character_end_times_seconds"]:
            duration = int(max(alignment["character_end_times_seconds"])) + 1
        else:
            duration = int(len(story_text.split()) / 2.5)

        segments = self._chars_to_sentence_segments(story_text, alignment)
        audio_path = await self._upload_audio(
            story_id, audio_bytes,
            path_override=audio_path_override,
            bucket_override=bucket_override,
        )

        return PublishResult(
            audio_path=audio_path,
            duration_seconds=duration,
            segments=segments,
        )


class MockAudioPublisher(AudioPublisherService):
    """Returns canned data for tests — no API calls."""

    async def publish(
        self,
        story_id: str,
        story_text: str,
        voice_id: str | None = None,
        audio_path_override: str | None = None,
        bucket_override: str | None = None,
    ) -> PublishResult:
        sentences = re.split(r'(?<=[.!?])\s+', story_text.strip())
        duration = int(len(story_text.split()) / 2.5)
        time_per = duration / max(len(sentences), 1)
        segments = [
            {
                "text": s.strip(),
                "startTime": round(i * time_per, 2),
                "endTime": round((i + 1) * time_per, 2),
            }
            for i, s in enumerate(sentences) if s.strip()
        ]
        return PublishResult(
            audio_path=audio_path_override or f"stories/{story_id}/audio.mp3",
            duration_seconds=duration,
            segments=segments,
        )
