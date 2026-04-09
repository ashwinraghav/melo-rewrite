"""
Cover art generation service — Vertex AI Imagen 3.0 + GCS upload.

ABC interface + production (Vertex AI) and test (mock) implementations.
"""
from __future__ import annotations

import asyncio
import io
import logging
import time
from abc import ABC, abstractmethod

from google import genai
from google.genai import types
from gcloud.aio.storage import Storage
from opentelemetry import trace
from PIL import Image

from ..metrics import (
    gcs_operation_duration, gcs_errors,
    genai_request_duration, genai_errors,
)

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

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
    "emotions": "Use warm peaches, soft pinks, and gentle lavenders.",
    "social": "Use warm yellows, soft peaches, and sky blues.",
    "communication": "Use soft teals, warm greens, and gentle aquas.",
    "boundaries": "Use soft blues, calm lavenders, and light grays.",
    "change": "Use warm ambers, soft oranges, and golden yellows.",
    "community": "Use soft greens, warm yellows, and sky blues.",
    "safety": "Use deep soft blues, lavenders, and moonlit silver tones.",
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


def build_safe_fallback_prompt(topics: list[str]) -> str:
    """Stripped-down prompt used when the full prompt trips the safety filter."""
    topic = topics[0] if topics else "park"
    palette_hint = TOPIC_PALETTE.get(topic, "")
    return (
        f"{STYLE_PROMPT}\n\n"
        f"A peaceful, calming nature scene.\n"
        f"{palette_hint}\n\n"
        f"Illustrate a serene landscape with animals and soft colors. No people."
    )


class CoverGeneratorService(ABC):
    @abstractmethod
    async def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str | None:
        """Generate cover art and upload to GCS. Returns the GCS path, or None if generation failed."""
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
    ) -> str | None:
        prompt = build_cover_prompt(title, description, topics)
        gcs_path = f"stories/{story_id}/cover.webp"
        safety_rejected = False

        # Retry — Imagen's safety filter can spuriously reject prompts
        image_data = None
        for attempt in range(MAX_RETRIES):
            with tracer.start_as_current_span(
                "genai.generate_images",
                attributes={
                    "genai.model": MODEL,
                    "genai.operation": "generate_images",
                    "genai.attempt": attempt + 1,
                    "genai.safety_fallback": safety_rejected,
                },
            ) as span:
                t0 = time.monotonic()
                try:
                    response = await self._client.aio.models.generate_images(
                        model=MODEL,
                        prompt=prompt,
                        config=types.GenerateImagesConfig(
                            number_of_images=1,
                            aspect_ratio="1:1",
                            include_rai_reason=True,
                        ),
                    )
                    genai_request_duration.record(
                        time.monotonic() - t0, {"operation": "generate_images"}
                    )
                    if response.generated_images:
                        img = response.generated_images[0]
                        if img.rai_filtered_reason:
                            log.warning(
                                "Imagen image filtered (attempt %d/%d, story=%s): %s",
                                attempt + 1, MAX_RETRIES, story_id, img.rai_filtered_reason,
                            )
                            span.set_attribute("genai.rai_filtered_reason", img.rai_filtered_reason)
                            safety_rejected = True
                        elif img.image and img.image.image_bytes:
                            image_data = img.image.image_bytes
                            break
                        else:
                            log.warning(
                                "Imagen returned image entry with no data (attempt %d/%d, story=%s)",
                                attempt + 1, MAX_RETRIES, story_id,
                            )
                    else:
                        log.warning(
                            "Imagen returned no images (attempt %d/%d, story=%s)",
                            attempt + 1, MAX_RETRIES, story_id,
                        )
                        span.set_attribute("genai.empty_response", True)
                except Exception as e:
                    genai_errors.add(1, {"operation": "generate_images"})
                    span.set_status(trace.StatusCode.ERROR, str(e))
                    err_str = str(e)
                    if "sensitive words" in err_str or "Responsible AI" in err_str:
                        safety_rejected = True
                        log.warning(
                            "Imagen prompt rejected by safety filter (attempt %d/%d, story=%s): %s",
                            attempt + 1, MAX_RETRIES, story_id, e,
                        )
                    else:
                        log.warning(
                            "Imagen error (attempt %d/%d, story=%s): %s",
                            attempt + 1, MAX_RETRIES, story_id, e,
                        )

            # On safety rejection, swap to a generic prompt for remaining attempts
            if safety_rejected and prompt != build_safe_fallback_prompt(topics):
                prompt = build_safe_fallback_prompt(topics)
                log.info("Switching to safe fallback prompt for story=%s", story_id)

            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(2)

        if image_data is None:
            log.error(
                "Cover art generation failed after %d attempts for story=%s (safety_rejected=%s), "
                "publishing without cover",
                MAX_RETRIES, story_id, safety_rejected,
            )
            return None

        image = Image.open(io.BytesIO(image_data))

        # Generate multiple sizes for mobile-first responsive loading:
        #   cover.webp  — 384px for player/favorites (192px @ 2x retina)
        #   thumb.webp  — 96px for list thumbnails (48px @ 2x retina)
        variants = [
            (gcs_path, 384, 80),
            (f"stories/{story_id}/thumb.webp", 96, 75),
        ]

        for variant_path, size, quality in variants:
            resized = image.resize((size, size), Image.LANCZOS)
            buf = io.BytesIO()
            resized.save(buf, "WEBP", quality=quality)
            buf.seek(0)
            variant_bytes = buf.read()

            with tracer.start_as_current_span(
                "gcs.upload",
                attributes={
                    "gcs.bucket": self._bucket_name,
                    "gcs.path": variant_path,
                    "gcs.operation": "upload",
                    "gcs.bytes": len(variant_bytes),
                },
            ) as span:
                t0 = time.monotonic()
                try:
                    await self._storage.upload(
                        self._bucket_name, variant_path, variant_bytes,
                        content_type="image/webp",
                    )
                    gcs_operation_duration.record(
                        time.monotonic() - t0,
                        {"operation": "upload", "bucket": self._bucket_name},
                    )
                except Exception as e:
                    gcs_errors.add(1, {"operation": "upload", "bucket": self._bucket_name})
                    span.set_status(trace.StatusCode.ERROR, str(e))
                    raise

        return gcs_path


class MockCoverGenerator(CoverGeneratorService):
    """Returns a canned GCS path for tests — no API calls."""

    async def generate_and_upload(
        self, story_id: str, title: str, description: str, topics: list[str]
    ) -> str:
        return f"stories/{story_id}/cover.webp"
