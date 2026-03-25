"""
Cover art generation service — Vertex AI Imagen 3.0 + GCS upload.

Extracted from scripts/generate-covers.py.
ABC interface + production (Vertex AI) and test (mock) implementations.
"""
from __future__ import annotations

import io
from abc import ABC, abstractmethod

from google import genai
from google.genai import types
from google.cloud import storage as gcs
from PIL import Image


STYLE_PROMPT = (
    "Create a children's book cover illustration in a soft watercolor style. "
    "Use gentle pastel colors with a warm, dreamy atmosphere. "
    "The style should be calm, cozy, and lo-fi — like a bedtime storybook. "
    "IMPORTANT: Do not include any text, words, letters, numbers, or title anywhere in the image. "
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
        f'Story title: "{title}"\n'
        f"Story description: {description}\n"
        f"{palette_hint}\n\n"
        f"Illustrate the main scene or character from this children's story."
    )


class CoverGeneratorService(ABC):
    @abstractmethod
    def generate_and_upload(
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
        self._gcp_project_id = gcp_project_id

    def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str:
        prompt = build_cover_prompt(title, description, topics)
        gcs_path = f"stories/{story_id}/cover.webp"

        response = self._client.models.generate_images(
            model=MODEL,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
            ),
        )

        if not response.generated_images:
            raise RuntimeError("Cover art generation failed (no images returned)")

        image_data = response.generated_images[0].image.image_bytes
        image = Image.open(io.BytesIO(image_data))
        image = image.resize((512, 512), Image.LANCZOS)

        buf = io.BytesIO()
        image.save(buf, "WEBP", quality=85)
        buf.seek(0)

        client = gcs.Client(project=self._gcp_project_id)
        bucket = client.bucket(self._bucket_name)
        blob = bucket.blob(gcs_path)
        blob.upload_from_file(buf, content_type="image/webp")

        return gcs_path


class MockCoverGenerator(CoverGeneratorService):
    """Returns a canned GCS path for tests — no API calls."""

    def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str:
        return f"stories/{story_id}/cover.webp"
