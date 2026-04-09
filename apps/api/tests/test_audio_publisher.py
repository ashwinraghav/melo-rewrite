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
        assert settings.stability == 0.46
        assert settings.style == 0.0
        assert settings.speed == 0.95

    def test_preschool_age_5(self):
        settings = ElevenLabsPublisher._voice_settings_for_age(5)
        assert settings.stability == 0.46
        assert settings.style == 0.0

    def test_none_defaults_to_preschool(self):
        """When age_min is unknown, use the preschool settings."""
        settings = ElevenLabsPublisher._voice_settings_for_age(None)
        assert settings.stability == 0.46
        assert settings.style == 0.0

    def test_toddler_more_expressive_than_preschool(self):
        toddler = ElevenLabsPublisher._voice_settings_for_age(1)
        preschool = ElevenLabsPublisher._voice_settings_for_age(4)
        assert toddler.style > preschool.style

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


def _fake_alignment(text: str, secs_per_char: float = 0.05) -> dict:
    """Build a fake character-level alignment for a given text.

    Each character gets monotonically increasing timestamps at a fixed rate.
    This lets us verify that sentence boundaries land at the correct offsets.
    """
    chars = list(text)
    n = len(chars)
    starts = [round(i * secs_per_char, 3) for i in range(n)]
    ends = [round((i + 1) * secs_per_char, 3) for i in range(n)]
    return {
        "characters": chars,
        "character_start_times_seconds": starts,
        "character_end_times_seconds": ends,
    }


class TestCharsToSentenceSegments:
    """Verify character-to-sentence mapping uses TTS text for offsets.

    Regression suite for the timestamp-drift bug: when pronunciation hints
    make display text and TTS text different lengths, character offsets must
    track TTS text (which matches the alignment data from ElevenLabs).
    Using display text for offsets causes cumulative drift — timestamps shift
    earlier for every sentence after a hint, up to seconds by mid-story.
    """

    # ── Basic correctness (no hints) ──────────────────────────────────────

    def test_no_hints_timestamps_match(self):
        """Without hints, TTS and display text are identical — baseline."""
        text = "The sun rose. Birds sang. The day began."
        alignment = _fake_alignment(text)
        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            text, text, alignment,
        )
        assert len(segments) == 3
        assert segments[0]["text"] == "The sun rose."
        assert segments[1]["text"] == "Birds sang."
        assert segments[2]["text"] == "The day began."
        # Each sentence starts at the right character offset
        assert segments[0]["startTime"] == 0.0
        assert segments[1]["startTime"] == round(text.index("Birds") * 0.05, 3)
        assert segments[2]["startTime"] == round(text.index("The day") * 0.05, 3)

    # ── Single hint: display text shorter than TTS ────────────────────────

    def test_single_hint_display_shorter(self):
        """display 'sambar' (6) vs TTS 'saambar' (7) — offset must track TTS."""
        original = "She loved sambar {saambar}. The pool was warm."
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)
        alignment = _fake_alignment(tts)

        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 2
        assert segments[0]["text"] == "She loved sambar."
        assert segments[1]["text"] == "The pool was warm."
        assert segments[1]["startTime"] == round(tts.index("The") * 0.05, 3)

    # ── Single hint: display text longer than TTS ─────────────────────────

    def test_single_hint_display_longer(self):
        """display 'Qu'ran' (6) vs TTS 'Koran' (5) — offset must track TTS."""
        original = "She read the Qu'ran {Koran}. It was beautiful."
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)
        alignment = _fake_alignment(tts)

        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 2
        assert segments[0]["text"] == "She read the Qu'ran."
        assert segments[1]["text"] == "It was beautiful."
        assert segments[1]["startTime"] == round(tts.index("It") * 0.05, 3)

    # ── Multiple hints: cumulative drift regression ───────────────────────

    def test_multiple_hints_no_cumulative_drift(self):
        """Multiple hints across sentences must not cause cumulative drift.

        This is the exact scenario that caused the original bug: each hint
        shifts the offset by a few characters, and by the 3rd-4th sentence
        the timestamps are off by over a second.
        """
        original = (
            "Idli {idlee} bounced on the plate. "
            "Dosa {dohsa} rolled around. "
            "Sambar {saambar} splashed everywhere. "
            "The kitchen was a mess."
        )
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)
        alignment = _fake_alignment(tts)

        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 4
        assert segments[0]["text"] == "Idli bounced on the plate."
        assert segments[1]["text"] == "Dosa rolled around."
        assert segments[2]["text"] == "Sambar splashed everywhere."
        assert segments[3]["text"] == "The kitchen was a mess."

        # Critical: last sentence timestamp must match TTS offset, not display
        expected_start = round(tts.index("The kitchen") * 0.05, 3)
        assert segments[3]["startTime"] == expected_start

    # ── Monotonicity: timestamps must never go backwards ──────────────────

    def test_timestamps_monotonically_increasing(self):
        """Regardless of hint lengths, segment start times must increase."""
        original = (
            "Appa {ah-pah} sat down. "
            "Amma {ah-mah} stood up. "
            "Thatha {tah-tah} laughed. "
            "Paati {pah-tee} smiled. "
            "Everyone was happy."
        )
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)
        alignment = _fake_alignment(tts)

        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 5
        for i in range(1, len(segments)):
            assert segments[i]["startTime"] > segments[i - 1]["startTime"], (
                f"Segment {i} startTime ({segments[i]['startTime']}) must be "
                f"after segment {i - 1} startTime ({segments[i - 1]['startTime']})"
            )

    # ── End-to-end: segments span the full audio duration ─────────────────

    def test_segments_cover_full_text(self):
        """Every sentence in the display text must appear in segments."""
        original = (
            "Upma {oopma} is warm. "
            "Poha {pohah} is light. "
            "Chai {chay} is perfect."
        )
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)
        alignment = _fake_alignment(tts)

        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        segment_texts = [s["text"] for s in segments]
        assert segment_texts == [
            "Upma is warm.",
            "Poha is light.",
            "Chai is perfect.",
        ]

    # ── Edge case: no hints at all ────────────────────────────────────────

    def test_no_hints_still_works(self):
        """The two-text signature must not break plain text (no hints)."""
        text = "Hello world. Goodbye world."
        alignment = _fake_alignment(text)
        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            text, text, alignment,
        )
        assert len(segments) == 2
        assert segments[0]["text"] == "Hello world."
        assert segments[1]["text"] == "Goodbye world."

    # ── Edge case: single sentence ────────────────────────────────────────

    def test_single_sentence(self):
        original = "Sambar {saambar} is delicious."
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)
        alignment = _fake_alignment(tts)

        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 1
        assert segments[0]["text"] == "Sambar is delicious."
        assert segments[0]["startTime"] == 0.0


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
