"""
Semantic search service — Firestore vector search + Cohere rerank.

1. Embed the user query via EmbeddingService
2. Firestore find_nearest (KNN) → top candidates with cosine similarity
3. Cohere Rerank the candidates → final ranked playlist
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

import cohere
from opentelemetry import trace

from ..metrics import cohere_request_duration, cohere_errors

if TYPE_CHECKING:
    from ..models.story import Story
    from ..repositories.interfaces import StoryRepository
    from .embedding import EmbeddingService

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

RETRIEVAL_K = 20  # candidates from vector search


class SearchService:
    def __init__(self, embedding_service: "EmbeddingService", cohere_api_key: str = "") -> None:
        self._embedding = embedding_service
        self._cohere = cohere.AsyncClientV2(api_key=cohere_api_key) if cohere_api_key else None

    async def search(
        self,
        query: str,
        story_repo: "StoryRepository",
        child_age: int | None = None,
        limit: int = 10,
    ) -> list[tuple["Story", float]]:
        # Embed query
        query_embedding = await self._embedding.embed_text(query)

        # Firestore KNN vector search — returns top candidates
        candidates = await story_repo.vector_search(query_embedding, limit=RETRIEVAL_K)

        # Filter by child age in-memory (Firestore vector search doesn't support
        # compound filters with inequality on other fields)
        if child_age is not None:
            candidates = [
                (s, score) for s, score in candidates
                if s.age_min <= child_age <= s.age_max
            ]

        if not candidates:
            return []

        # Cohere rerank for better relevance
        if self._cohere:
            return await self._rerank(query, candidates, limit)

        # Fallback: return vector search results directly
        return candidates[:limit]

    async def _rerank(
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
            with tracer.start_as_current_span(
                "cohere.rerank",
                attributes={
                    "cohere.model": "rerank-v3.5",
                    "cohere.num_documents": len(documents),
                    "cohere.top_n": limit,
                },
            ) as span:
                t0 = time.monotonic()
                try:
                    response = await self._cohere.rerank(
                        model="rerank-v3.5",
                        query=query,
                        documents=documents,
                        top_n=limit,
                    )
                    cohere_request_duration.record(
                        time.monotonic() - t0, {"operation": "rerank"}
                    )
                except Exception as e:
                    cohere_errors.add(1, {"operation": "rerank"})
                    span.set_status(trace.StatusCode.ERROR, str(e))
                    raise

            results = []
            for item in response.results:
                story, _ = candidates[item.index]
                results.append((story, item.relevance_score))
            return results
        except Exception as e:
            log.warning("Cohere rerank failed, falling back to vector search: %s", e)
            return candidates[:limit]

    # Legacy methods kept for backward compatibility during transition
    def load_embeddings(self, stories: list["Story"]) -> None:
        pass  # No-op — Firestore handles this natively

    def invalidate(self) -> None:
        pass  # No-op — Firestore index is always up to date
