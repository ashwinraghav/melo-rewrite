"""Unit tests for SearchService with Firestore vector search."""
import math
import pytest
from unittest.mock import MagicMock, patch

from mello_api.services.search import SearchService
from mello_api.services.embedding import MockEmbeddingService
from mello_api.repositories.memory import MemoryStoryRepository
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


def _make_repo(stories: list[Story]) -> MemoryStoryRepository:
    repo = MemoryStoryRepository()
    repo.seed(stories)
    return repo


class TestSearchService:
    def setup_method(self):
        self.embedding = MockEmbeddingService()
        self.service = SearchService(embedding_service=self.embedding)
        self.stories = [
            _make_story("s1", themes="bedtime routine sleep calm"),
            _make_story("s2", themes="playground friends sharing toys"),
            _make_story("s3", themes="nature park trees animals"),
        ]
        self.repo = _make_repo(self.stories)

    def test_search_returns_results(self):
        results = self.service.search("bedtime", self.repo)
        assert len(results) > 0
        assert all(isinstance(r[1], float) for r in results)

    def test_search_filters_unpublished(self):
        stories = self.stories + [_make_story("unpub", is_published=False)]
        repo = _make_repo(stories)
        results = self.service.search("bedtime", repo)
        ids = [s.id for s, _ in results]
        assert "unpub" not in ids

    def test_search_filters_by_child_age(self):
        stories = [
            _make_story("young", age_min=2, age_max=4),
            _make_story("old", age_min=8, age_max=12),
        ]
        repo = _make_repo(stories)
        results = self.service.search("bedtime", repo, child_age=3)
        ids = [s.id for s, _ in results]
        assert "young" in ids
        assert "old" not in ids

    def test_search_respects_limit(self):
        results = self.service.search("stories", self.repo, limit=1)
        assert len(results) <= 1

    def test_search_no_eligible_stories_returns_empty(self):
        results = self.service.search("bedtime", self.repo, child_age=99)
        assert results == []

    def test_search_stories_without_embedding_excluded(self):
        no_emb = Story(
            id="no-emb", title="No Embedding", description="test",
            duration_seconds=60, duration_category="short",
            age_min=2, age_max=8, topics=["test"],
            audio_path="x", cover_art_path="x",
            is_published=True, created_at=_NOW, updated_at=_NOW,
        )
        repo = _make_repo([no_emb])
        results = self.service.search("test", repo)
        assert results == []

    def test_load_embeddings_is_noop(self):
        """Legacy method should not raise."""
        self.service.load_embeddings(self.stories)

    def test_invalidate_is_noop(self):
        """Legacy method should not raise."""
        self.service.invalidate()


class TestSearchServiceCohere:
    """Tests for the Cohere reranking path."""

    def setup_method(self):
        self.embedding = MockEmbeddingService()
        self.stories = [
            _make_story("s1", themes="bedtime routine sleep calm"),
            _make_story("s2", themes="playground friends sharing"),
        ]
        self.repo = _make_repo(self.stories)

    @patch("mello_api.services.search.cohere")
    def test_cohere_rerank_called_when_key_present(self, mock_cohere_module):
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
        results = service.search("bedtime", self.repo, limit=1)

        mock_client.rerank.assert_called_once()
        assert len(results) == 1
        assert results[0][1] == 0.95

    @patch("mello_api.services.search.cohere")
    def test_cohere_failure_falls_back_to_vector_search(self, mock_cohere_module):
        mock_client = MagicMock()
        mock_cohere_module.ClientV2.return_value = mock_client
        mock_client.rerank.side_effect = RuntimeError("Cohere API down")

        service = SearchService(
            embedding_service=self.embedding,
            cohere_api_key="test-key",
        )
        results = service.search("bedtime", self.repo)

        assert len(results) > 0
        assert all(-1.0 <= score <= 1.0 for _, score in results)
