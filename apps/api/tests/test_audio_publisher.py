"""Tests for audio publisher — voice settings by age group."""
import asyncio

from mello_api.services.audio_publisher import ElevenLabsPublisher, MockAudioPublisher


# ── Unit: _voice_settings_for_age ────────────────────────────────────────

class TestVoiceSettingsForAge:
    def test_toddler_age_1(self):
        settings = ElevenLabsPublisher._voice_settings_for_age(1)
        assert settings.stability == 0.50
        assert settings.style == 0.65
        assert settings.similarity_boost == 0.65

    def test_toddler_age_2(self):
        settings = ElevenLabsPublisher._voice_settings_for_age(2)
        assert settings.stability == 0.50
        assert settings.style == 0.65

    def test_preschool_age_3(self):
        settings = ElevenLabsPublisher._voice_settings_for_age(3)
        assert settings.stability == 0.65
        assert settings.style == 0.45

    def test_preschool_age_5(self):
        settings = ElevenLabsPublisher._voice_settings_for_age(5)
        assert settings.stability == 0.65
        assert settings.style == 0.45

    def test_none_defaults_to_preschool(self):
        """When age_min is unknown, use the less-aggressive preschool settings."""
        settings = ElevenLabsPublisher._voice_settings_for_age(None)
        assert settings.stability == 0.65
        assert settings.style == 0.45

    def test_toddler_more_expressive_than_preschool(self):
        toddler = ElevenLabsPublisher._voice_settings_for_age(1)
        preschool = ElevenLabsPublisher._voice_settings_for_age(4)
        assert toddler.style > preschool.style
        assert toddler.stability < preschool.stability

    def test_all_settings_have_speaker_boost(self):
        for age in [None, 1, 2, 3, 5]:
            settings = ElevenLabsPublisher._voice_settings_for_age(age)
            assert settings.use_speaker_boost is True


# ── Unit: inline pronunciation hints ────────────────────────────────────

class TestInlinePronunciation:
    """Inline hints: 'word {alias}' → TTS gets alias, display gets word."""

    def test_prepare_for_tts_replaces_word_with_alias(self):
        text = '"How strange," said upma {oopma}.'
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert result == '"How strange," said oopma.'

    def test_prepare_for_tts_multiple_hints(self):
        text = "Idli {idlee} and Dosa {dohsa} are friends."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert result == "idlee and dohsa are friends."

    def test_prepare_for_tts_no_hints(self):
        text = "A plain story with no hints."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert result == text

    def test_prepare_for_tts_hint_at_end_of_sentence(self):
        text = "She loved sambar {saambar}."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert result == "She loved saambar."

    def test_prepare_for_tts_hint_with_comma_after(self):
        text = "Idli {idlee}, round and fluffy."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert "idlee" in result

    def test_prepare_for_tts_multi_word_hint(self):
        text = "She made upma {oop mah} today."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert result == "She made oop mah today."

    def test_prepare_for_display_strips_hints(self):
        text = '"How strange," said upma {oopma}.'
        result = ElevenLabsPublisher._prepare_for_display(text)
        assert result == '"How strange," said upma.'

    def test_prepare_for_display_multiple_hints(self):
        text = "Idli {idlee} and Dosa {dohsa} are friends."
        result = ElevenLabsPublisher._prepare_for_display(text)
        assert result == "Idli and Dosa are friends."

    def test_prepare_for_display_no_hints(self):
        text = "A plain story with no hints."
        result = ElevenLabsPublisher._prepare_for_display(text)
        assert result == text

    def test_prepare_for_display_preserves_punctuation(self):
        text = "She loved sambar {saambar}!"
        result = ElevenLabsPublisher._prepare_for_display(text)
        assert result == "She loved sambar!"

    def test_round_trip_consistency(self):
        """Display text should never contain curly braces."""
        text = "Idli {idlee} and Dosa {dohsa} swam in sambar {saambar}."
        display = ElevenLabsPublisher._prepare_for_display(text)
        assert "{" not in display
        assert "}" not in display

    def test_tts_text_never_contains_braces(self):
        text = "Vada {vaada} is round."
        tts = ElevenLabsPublisher._prepare_for_tts(text)
        assert "{" not in tts
        assert "}" not in tts


class TestPublishWithHints:
    """Integration: MockAudioPublisher handles hints in story text."""

    def test_mock_publish_with_hints_returns_clean_segments(self):
        pub = MockAudioPublisher()
        text = "Idli {idlee} bounced. Dosa {dohsa} laughed."
        result = asyncio.run(pub.publish("test-id", text))
        for seg in result.segments:
            assert "{" not in seg["text"]
            assert "}" not in seg["text"]

    def test_mock_publish_without_hints_unchanged(self):
        pub = MockAudioPublisher()
        text = "A plain story. No hints here."
        result = asyncio.run(pub.publish("test-id", text))
        assert result.segments[0]["text"] == "A plain story."
        assert result.segments[1]["text"] == "No hints here."


# ── MockAudioPublisher accepts age_min ───────────────────────────────────

def test_mock_publisher_accepts_age_min():
    """MockAudioPublisher should accept age_min without error."""
    pub = MockAudioPublisher()
    result = asyncio.run(
        pub.publish("test-id", "Hello there little bunny. Welcome home.", age_min=1)
    )
    assert result.audio_path == "stories/test-id/audio.mp3"
    assert len(result.segments) == 2


# ── Integration: toddler publish flow ────────────────────────────────────

def test_toddler_publish_passes_age(creator_client, repos):
    """A toddler-tier story (age 2) should publish successfully with age_min threaded through."""
    from tests.conftest import auth

    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "a bedtime story", "age": 2},
        headers=auth("audio-test-user"),
    )
    assert gen_resp.status_code == 202
    story_id = gen_resp.json()["data"]["id"]

    # Verify the generated story has toddler age range
    story = asyncio.run(repos.stories.find_by_id_any(story_id))
    assert story.age_min == 1
    assert story.age_max == 3

    # Publish — SyncTaskQueue dispatches synchronously
    resp = creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth("audio-test-user"),
    )
    assert resp.status_code == 202

    # Verify the story published successfully
    published = asyncio.run(repos.stories.find_by_id(story_id))
    assert published.is_published is True
    assert published.publish_status == "ready"
    assert published.audio_path != ""


def test_preschool_publish_passes_age(creator_client, repos):
    """A preschool-tier story (age 4) should publish successfully."""
    from tests.conftest import auth

    gen_resp = creator_client.post(
        "/v1/creator/generate",
        json={"prompt": "a story about a fox", "age": 4},
        headers=auth("audio-test-user"),
    )
    story_id = gen_resp.json()["data"]["id"]

    resp = creator_client.post(
        f"/v1/creator/stories/{story_id}/publish",
        headers=auth("audio-test-user"),
    )
    assert resp.status_code == 202

    published = asyncio.run(repos.stories.find_by_id(story_id))
    assert published.is_published is True
    assert published.publish_status == "ready"
