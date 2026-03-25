"""Unit tests for SearchService and cosine_similarity."""
import math
import pytest
from unittest.mock import MagicMock, patch

from mello_api.services.search import SearchService, cosine_similarity
from mello_api.services.embedding import MockEmbeddingService
from mello_api.models.story import Story

_NOW = "2024-01-01T00:00:00+00:00"
_EMB = MockEmbeddingService()


def _make_story(id: str, themes: str = "test", **kwargs) -> Story:
    """Create a minimal published story with an embedding."""
    defaults = dict(
        id=id,
        title=f"Story {id}",
        description=f"Description for {id}",
        duration_seconds=300,
        duration_category="short",
        age_min=2,
        age_max=8,
        topics=["test"],
        audio_path=f"stories/{id}/audio.mp3",
        cover_art_path=f"stories/{id}/cover.webp",
        story_text="Once upon a time...",
        themes=themes,
        is_published=True,
        created_at=_NOW,
        updated_at=_NOW,
    )
    defaults.update(kwargs)
    story = Story(**defaults)
    if themes:
        story.embedding = _EMB.embed_story(story)
    return story


# ── cosine_similarity unit tests ─────────────────────────────────────────

class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = [1.0, 2.0, 3.0]
        assert cosine_similarity(v, v) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert cosine_similarity(a, b) == pytest.approx(0.0)

    def test_opposite_vectors(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert cosine_similarity(a, b) == pytest.approx(-1.0)

    def test_zero_vector_returns_zero(self):
        a = [0.0, 0.0, 0.0]
        b = [1.0, 2.0, 3.0]
        assert cosine_similarity(a, b) == 0.0

    def test_both_zero_vectors(self):
        a = [0.0, 0.0]
        b = [0.0, 0.0]
        assert cosine_similarity(a, b) == 0.0


# ── SearchService unit tests ─────────────────────────────────────────────

class TestSearchService:
    def setup_method(self):
        self.embedding = MockEmbeddingService()
        self.service = SearchService(embedding_service=self.embedding)
        self.stories = [
            _make_story("s1", themes="bedtime routine sleep calm"),
            _make_story("s2", themes="playground friends sharing toys"),
            _make_story("s3", themes="nature park trees animals"),
        ]

    def test_search_returns_results(self):
        results = self.service.search("bedtime", self.stories)
        assert len(results) > 0
        # Each result is (Story, score)
        assert all(isinstance(r[1], float) for r in results)

    def test_search_filters_unpublished(self):
        stories = self.stories + [
            _make_story("unpub", is_published=False),
        ]
        results = self.service.search("bedtime", stories)
        ids = [s.id for s, _ in results]
        assert "unpub" not in ids

    def test_search_filters_by_child_age(self):
        stories = [
            _make_story("young", age_min=2, age_max=4),
            _make_story("old", age_min=8, age_max=12),
        ]
        results = self.service.search("bedtime", stories, child_age=3)
        ids = [s.id for s, _ in results]
        assert "young" in ids
        assert "old" not in ids

    def test_search_respects_limit(self):
        results = self.service.search("stories", self.stories, limit=1)
        assert len(results) <= 1

    def test_search_no_eligible_stories_returns_empty(self):
        results = self.service.search("bedtime", self.stories, child_age=99)
        assert results == []

    def test_search_stories_without_embedding_excluded(self):
        no_emb = Story(
            id="no-emb", title="No Embedding", description="test",
            duration_seconds=60, duration_category="short",
            age_min=2, age_max=8, topics=["test"],
            audio_path="x", cover_art_path="x",
            is_published=True, created_at=_NOW, updated_at=_NOW,
        )
        assert no_emb.embedding == []
        results = self.service.search("test", [no_emb])
        assert results == []

    def test_invalidate_forces_reload(self):
        self.service.load_embeddings(self.stories)
        assert self.service._loaded is True
        self.service.invalidate()
        assert self.service._loaded is False

    def test_load_embeddings_caches(self):
        self.service.load_embeddings(self.stories)
        assert len(self.service._cache) == len(self.stories)


class TestSearchServiceCohere:
    """Tests for the Cohere reranking path."""

    def setup_method(self):
        self.embedding = MockEmbeddingService()
        self.stories = [
            _make_story("s1", themes="bedtime routine sleep calm"),
            _make_story("s2", themes="playground friends sharing"),
        ]

    @patch("mello_api.services.search.cohere")
    def test_cohere_rerank_called_when_key_present(self, mock_cohere_module):
        """When a Cohere API key is set, reranking should be invoked."""
        mock_client = MagicMock()
        mock_cohere_module.ClientV2.return_value = mock_client

        mock_result = MagicMock()
        mock_result.index = 0
        mock_result.relevance_score = 0.95
        mock_response = MagicMock()
        mock_response.results = [mock_result]
        mock_client.rerank.return_value = mock_response

        service = SearchService(
            embedding_service=self.embedding,
            cohere_api_key="test-key",
        )
        results = service.search("bedtime", self.stories, limit=1)

        mock_client.rerank.assert_called_once()
        assert len(results) == 1
        assert results[0][1] == 0.95

    @patch("mello_api.services.search.cohere")
    def test_cohere_failure_falls_back_to_cosine(self, mock_cohere_module):
        """If Cohere raises, should fall back to cosine similarity results."""
        mock_client = MagicMock()
        mock_cohere_module.ClientV2.return_value = mock_client
        mock_client.rerank.side_effect = RuntimeError("Cohere API down")

        service = SearchService(
            embedding_service=self.embedding,
            cohere_api_key="test-key",
        )
        results = service.search("bedtime", self.stories)

        # Should still return results (cosine fallback)
        assert len(results) > 0
        # Scores should be cosine similarity values, not Cohere scores
        assert all(-1.0 <= score <= 1.0 for _, score in results)
