"""
Pronunciation map service tests.
"""
import pytest
from mello_api.services.pronunciation import MockPronunciationService
from mello_api.config import NARRATOR_VOICES, ACCENT_LABELS


@pytest.mark.anyio
async def test_mock_pronunciation_returns_empty_dict():
    service = MockPronunciationService()
    result = await service.generate_map("Once upon a time...", "British English")
    assert result == {}


@pytest.mark.anyio
async def test_mock_pronunciation_accepts_any_accent():
    service = MockPronunciationService()
    for accent in ACCENT_LABELS.values():
        result = await service.generate_map("A story about Kehlani.", accent)
        assert isinstance(result, dict)


def test_accent_labels_cover_all_narrator_voices():
    """Every key in NARRATOR_VOICES must have a corresponding ACCENT_LABELS entry."""
    for key in NARRATOR_VOICES:
        assert key in ACCENT_LABELS, f"Missing accent label for voice key: {key}"
