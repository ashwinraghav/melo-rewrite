"""
Embedding service — Vertex AI text-embedding-005.

Generates 768-dimensional vectors for semantic search.
ABC interface + production (Vertex AI) and test (mock) implementations.
"""
from __future__ import annotations

import hashlib
import struct
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from google import genai

if TYPE_CHECKING:
    from ..models.story import Story

EMBEDDING_MODEL = "text-embedding-005"


class EmbeddingService(ABC):
    @abstractmethod
    def embed_text(self, text: str) -> list[float]: ...

    def embed_story(self, story: "Story") -> list[float]:
        """Build composite text from story themes and embed it."""
        text = f"{story.title}. {story.description}. {story.themes}"
        return self.embed_text(text)


class VertexEmbeddingService(EmbeddingService):
    def __init__(self, gcp_project_id: str, gcp_location: str) -> None:
        self._client = genai.Client(
            vertexai=True, project=gcp_project_id, location=gcp_location
        )

    def embed_text(self, text: str) -> list[float]:
        response = self._client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        return list(response.embeddings[0].values)


class MockEmbeddingService(EmbeddingService):
    """Deterministic hash-based embeddings for tests. No API calls."""

    DIMS = 768

    def embed_text(self, text: str) -> list[float]:
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
