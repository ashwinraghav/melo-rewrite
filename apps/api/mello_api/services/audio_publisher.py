"""
Audio publishing service — ElevenLabs TTS + GCS upload.

Extracted from scripts/generate-stories.py (lines 1358-1431).
ABC interface + production (ElevenLabs) and test (mock) implementations.
"""
from __future__ import annotations

import base64
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import requests
from google.cloud import storage as gcs


@dataclass
class PublishResult:
    audio_path: str
    duration_seconds: int
    segments: list[dict] = field(default_factory=list)


class AudioPublisherService(ABC):
    @abstractmethod
    def publish(self, story_id: str, story_text: str) -> PublishResult: ...


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
        self._api_key = api_key
        self._voice_id = voice_id
        self._model_id = model_id
        self._bucket_name = bucket_name
        self._gcp_project_id = gcp_project_id

    def _generate_with_timestamps(self, text: str) -> dict:
        resp = requests.post(
            f"{self.API_BASE}/text-to-speech/{self._voice_id}/with-timestamps",
            headers={
                "xi-api-key": self._api_key,
                "Content-Type": "application/json",
            },
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
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()

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

    def _upload_audio(self, story_id: str, audio_bytes: bytes) -> str:
        gcs_path = f"stories/{story_id}/audio.mp3"
        client = gcs.Client(project=self._gcp_project_id)
        bucket = client.bucket(self._bucket_name)
        blob = bucket.blob(gcs_path)
        blob.upload_from_string(audio_bytes, content_type="audio/mpeg")
        return gcs_path

    def publish(self, story_id: str, story_text: str) -> PublishResult:
        result = self._generate_with_timestamps(story_text)

        audio_bytes = base64.b64decode(result["audio_base64"])
        alignment = result["alignment"]

        if alignment["character_end_times_seconds"]:
            duration = int(max(alignment["character_end_times_seconds"])) + 1
        else:
            duration = int(len(story_text.split()) / 2.5)

        segments = self._chars_to_sentence_segments(story_text, alignment)
        audio_path = self._upload_audio(story_id, audio_bytes)

        return PublishResult(
            audio_path=audio_path,
            duration_seconds=duration,
            segments=segments,
        )


class MockAudioPublisher(AudioPublisherService):
    """Returns canned data for tests — no API calls."""

    def publish(self, story_id: str, story_text: str) -> PublishResult:
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
            audio_path=f"stories/{story_id}/audio.mp3",
            duration_seconds=duration,
            segments=segments,
        )
