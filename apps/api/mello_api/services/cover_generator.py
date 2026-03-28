"""
Cover art generation service — Vertex AI Imagen 3.0 + GCS upload.

Extracted from scripts/generate-covers.py.
ABC interface + production (Vertex AI) and test (mock) implementations.
"""
from __future__ import annotations

import asyncio
import io
import logging
from abc import ABC, abstractmethod

from google import genai
from google.genai import types
from gcloud.aio.storage import Storage
from PIL import Image

log = logging.getLogger(__name__)

MAX_RETRIES = 3


STYLE_PROMPT = (
    "Create a whimsical watercolor illustration of a scene. "
    "Use gentle pastel colors with a warm, dreamy atmosphere. "
    "The style should be calm, cozy, and lo-fi — like a storybook illustration. "
    "IMPORTANT: Do not include any text, words, letters, numbers, or title anywhere in the image. "
    "Do not depict any people or human figures. Focus on animals, objects, landscapes, and nature. "
    "Pure illustration only, no typography. "
    "Soft rounded shapes, gentle lighting, muted shadows. "
    "The color palette should lean toward soft blues, lavenders, warm peaches, "
    "and mint greens on a slightly warm off-white background. "
    "Square format, simple composition with a clear focal point."
)

TOPIC_PALETTE = {
    "park": "Use soft greens, warm yellows, and sky blues.",
    "friends": "Use warm peaches, soft pinks, and gentle lavenders.",
    "bedtime": "Use deep soft blues, lavenders, and moonlit silver tones.",
    "food": "Use warm oranges, soft reds, gentle yellows, and cream tones.",
}

MODEL = "imagen-3.0-generate-002"


def build_cover_prompt(title: str, description: str, topics: list[str]) -> str:
    topic = topics[0] if topics else "park"
    palette_hint = TOPIC_PALETTE.get(topic, "")
    return (
        f"{STYLE_PROMPT}\n\n"
        f"Theme: {title}\n"
        f"Scene mood: {description}\n"
        f"{palette_hint}\n\n"
        f"Illustrate the setting or environment of this scene using only animals, "
        f"objects, and nature. No people."
    )


class CoverGeneratorService(ABC):
    @abstractmethod
    async def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str:
        """Generate cover art and upload to GCS. Returns the GCS path."""
        ...


class VertexCoverGenerator(CoverGeneratorService):
    def __init__(self, gcp_project_id: str, gcp_location: str, bucket_name: str) -> None:
        self._client = genai.Client(
            vertexai=True, project=gcp_project_id, location=gcp_location
        )
        self._bucket_name = bucket_name
        self._storage = Storage()

    async def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str:
        prompt = build_cover_prompt(title, description, topics)
        gcs_path = f"stories/{story_id}/cover.webp"

        # Retry — Imagen's safety filter can spuriously reject prompts
        image_data = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await self._client.aio.models.generate_images(
                    model=MODEL,
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio="1:1",
                    ),
                )
                if response.generated_images:
                    image_data = response.generated_images[0].image.image_bytes
                    break
                log.warning("Imagen returned no images (attempt %d/%d)", attempt + 1, MAX_RETRIES)
            except Exception as e:
                log.warning("Imagen error (attempt %d/%d): %s", attempt + 1, MAX_RETRIES, e)
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(2)

        if image_data is None:
            log.warning("Cover art generation failed after %d attempts, publishing without cover", MAX_RETRIES)
            return gcs_path  # Return path anyway — story publishes without cover art

        image = Image.open(io.BytesIO(image_data))
        image = image.resize((512, 512), Image.LANCZOS)

        buf = io.BytesIO()
        image.save(buf, "WEBP", quality=85)
        buf.seek(0)

        await self._storage.upload(
            self._bucket_name, gcs_path, buf.read(),
            content_type="image/webp",
        )

        return gcs_path


class MockCoverGenerator(CoverGeneratorService):
    """Returns a canned GCS path for tests — no API calls."""

    async def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str:
        return f"stories/{story_id}/cover.webp"
