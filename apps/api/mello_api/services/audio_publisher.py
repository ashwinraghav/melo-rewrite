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

from elevenlabs import VoiceSettings
from elevenlabs.client import AsyncElevenLabs
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
        age_min: int | None = None,
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
        self._client = AsyncElevenLabs(api_key=api_key, timeout=120)
        self._storage = Storage()

    @staticmethod
    def _voice_settings_for_age(age_min: int | None) -> VoiceSettings:
        """Pick voice expressiveness based on target age group."""
        if age_min is not None and age_min <= 2:
            # Toddler (1-3): sing-song, animated, playful
            return VoiceSettings(
                stability=0.50,
                similarity_boost=0.65,
                style=0.65,
                use_speaker_boost=True,
            )
        # Preschool (3-6): warm and engaging, moderately expressive
        return VoiceSettings(
            stability=0.65,
            similarity_boost=0.70,
            style=0.45,
            use_speaker_boost=True,
        )

    @staticmethod
    def _prepare_for_tts(text: str) -> str:
        """Replace 'word {alias}' with just 'alias' for TTS input."""
        return re.sub(r'\S+\s*\{([^}]+)\}', r'\1', text)

    @staticmethod
    def _prepare_for_display(text: str) -> str:
        """Strip '{alias}' hints, keeping the original word for display."""
        return re.sub(r'\s*\{[^}]+\}', '', text)

    async def _generate_with_timestamps(
        self, text: str, voice_id: str | None = None, age_min: int | None = None,
    ) -> tuple[bytes, dict]:
        """Generate TTS with timestamps. Returns (audio_bytes, alignment_dict)."""
        vid = voice_id or self._voice_id
        voice_settings = self._voice_settings_for_age(age_min)
        with tracer.start_as_current_span(
            "elevenlabs.tts",
            attributes={
                "elevenlabs.operation": "text_to_speech",
                "elevenlabs.voice_id": vid,
                "elevenlabs.model_id": self._model_id,
                "elevenlabs.text_length": len(text),
                "elevenlabs.age_min": age_min or -1,
            },
        ) as span:
            t0 = time.monotonic()
            try:
                result = await self._client.text_to_speech.convert_with_timestamps(
                    voice_id=vid,
                    text=text,
                    model_id=self._model_id,
                    voice_settings=voice_settings,
                )
                elevenlabs_request_duration.record(
                    time.monotonic() - t0, {"operation": "tts"}
                )
                audio_bytes = base64.b64decode(result.audio_base_64)
                alignment = {
                    "characters": result.alignment.characters,
                    "character_start_times_seconds": result.alignment.character_start_times_seconds,
                    "character_end_times_seconds": result.alignment.character_end_times_seconds,
                } if result.alignment else {"characters": [], "character_start_times_seconds": [], "character_end_times_seconds": []}
                return audio_bytes, alignment
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
        age_min: int | None = None,
    ) -> PublishResult:
        # Inline pronunciation hints: "word {alias}" → TTS gets "alias", display gets "word"
        tts_text = self._prepare_for_tts(story_text)
        display_text = self._prepare_for_display(story_text)

        audio_bytes, alignment = await self._generate_with_timestamps(
            tts_text, voice_id=voice_id, age_min=age_min,
        )

        if alignment["character_end_times_seconds"]:
            duration = int(max(alignment["character_end_times_seconds"])) + 1
        else:
            duration = int(len(display_text.split()) / 2.5)

        # Segments use display text so the UI shows correct spelling
        segments = self._chars_to_sentence_segments(display_text, alignment)
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
        age_min: int | None = None,
    ) -> PublishResult:
        display_text = ElevenLabsPublisher._prepare_for_display(story_text)
        sentences = re.split(r'(?<=[.!?])\s+', display_text.strip())
        duration = int(len(display_text.split()) / 2.5)
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
