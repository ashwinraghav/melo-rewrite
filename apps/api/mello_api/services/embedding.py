"""
Embedding service — Vertex AI text-embedding-005.

Generates 768-dimensional vectors for semantic search.
ABC interface + production (Vertex AI) and test (mock) implementations.
"""
from __future__ import annotations

import hashlib
import struct
import time
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from google import genai
from opentelemetry import trace

from ..metrics import genai_request_duration, genai_errors

if TYPE_CHECKING:
    from ..models.story import Story

tracer = trace.get_tracer(__name__)
EMBEDDING_MODEL = "text-embedding-005"


class EmbeddingService(ABC):
    @abstractmethod
    async def embed_text(self, text: str) -> list[float]: ...

    async def embed_story(self, story: "Story") -> list[float]:
        """Build composite text from story themes and embed it."""
        text = f"{story.title}. {story.description}. {story.themes}"
        return await self.embed_text(text)


class VertexEmbeddingService(EmbeddingService):
    def __init__(self, gcp_project_id: str, gcp_location: str) -> None:
        self._client = genai.Client(
            vertexai=True, project=gcp_project_id, location=gcp_location
        )

    async def embed_text(self, text: str) -> list[float]:
        with tracer.start_as_current_span(
            "genai.embed_content",
            attributes={"genai.model": EMBEDDING_MODEL, "genai.operation": "embed"},
        ) as span:
            t0 = time.monotonic()
            try:
                response = await self._client.aio.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=text,
                )
                genai_request_duration.record(
                    time.monotonic() - t0, {"operation": "embed_content"}
                )
                return list(response.embeddings[0].values)
            except Exception as e:
                genai_errors.add(1, {"operation": "embed_content"})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise


class MockEmbeddingService(EmbeddingService):
    """Deterministic hash-based embeddings for tests. No API calls."""

    DIMS = 768

    async def embed_text(self, text: str) -> list[float]:
        return self._embed_text_sync(text)

    def _embed_text_sync(self, text: str) -> list[float]:
        """Synchronous embedding for use at module-level in test fixtures."""
        h = hashlib.sha256(text.encode()).digest()
        # Expand hash to fill 768 floats deterministically
        result: list[float] = []
        for i in range(self.DIMS):
            seed = hashlib.md5(h + struct.pack("H", i)).digest()[:4]
            val = struct.unpack("f", seed)[0]
            # Normalize to [-1, 1]
            result.append(max(-1.0, min(1.0, val / 1e38)))
        # Normalize to unit vector
        mag = sum(x * x for x in result) ** 0.5
        if mag > 0:
            result = [x / mag for x in result]
        return result

    def embed_story_sync(self, story: "Story") -> list[float]:
        """Synchronous embed for use at module-level in test fixtures."""
        text = f"{story.title}. {story.description}. {story.themes}"
        return self._embed_text_sync(text)
