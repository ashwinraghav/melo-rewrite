"""
Semantic search service — in-memory cosine similarity + Cohere rerank.

1. Embed the user query via EmbeddingService
2. Cosine similarity against cached story embeddings → top candidates
3. Cohere Rerank the candidates → final ranked playlist
"""
from __future__ import annotations

import logging
import math
from typing import TYPE_CHECKING

import cohere

if TYPE_CHECKING:
    from ..models.story import Story
    from .embedding import EmbeddingService

log = logging.getLogger(__name__)

RETRIEVAL_K = 20  # candidates from cosine similarity


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


class SearchService:
    def __init__(self, embedding_service: "EmbeddingService", cohere_api_key: str = "") -> None:
        self._embedding = embedding_service
        self._cohere = cohere.ClientV2(api_key=cohere_api_key) if cohere_api_key else None
        self._cache: dict[str, list[float]] = {}
        self._loaded = False

    def load_embeddings(self, stories: list["Story"]) -> None:
        self._cache = {
            s.id: s.embedding
            for s in stories
            if s.embedding
        }
        self._loaded = True

    def invalidate(self) -> None:
        self._loaded = False

    def search(
        self,
        query: str,
        stories: list["Story"],
        child_age: int | None = None,
        limit: int = 10,
    ) -> list[tuple["Story", float]]:
        if not self._loaded:
            self.load_embeddings(stories)

        # Filter to eligible stories
        eligible = [
            s for s in stories
            if s.is_published and s.embedding
            and (child_age is None or s.age_min <= child_age <= s.age_max)
        ]

        if not eligible:
            return []

        # Embed query
        query_embedding = self._embedding.embed_text(query)

        # Cosine similarity → top candidates
        scored = []
        for story in eligible:
            emb = self._cache.get(story.id)
            if emb is None:
                continue
            score = cosine_similarity(query_embedding, emb)
            scored.append((story, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        candidates = scored[:RETRIEVAL_K]

        if not candidates:
            return []

        # Cohere rerank
        if self._cohere:
            return self._rerank(query, candidates, limit)

        # Fallback: just return cosine similarity results
        return candidates[:limit]

    def _rerank(
        self,
        query: str,
        candidates: list[tuple["Story", float]],
        limit: int,
    ) -> list[tuple["Story", float]]:
        try:
            documents = [
                f"{story.title}. {story.description}. {story.themes}"
                for story, _ in candidates
            ]
            response = self._cohere.rerank(
                model="rerank-v3.5",
                query=query,
                documents=documents,
                top_n=limit,
            )
            results = []
            for item in response.results:
                story, _ = candidates[item.index]
                results.append((story, item.relevance_score))
            return results
        except Exception as e:
            log.warning("Cohere rerank failed, falling back to cosine similarity: %s", e)
            return candidates[:limit]
