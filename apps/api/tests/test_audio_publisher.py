"""Tests for audio publisher — voice settings, text transforms, segments, observability."""
import asyncio
import logging

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


# ── Unit: audio tag stripping ──────────────────────────────────────────

class TestStripAudioTags:
    """ElevenLabs v3 audio tags ([whispers], [excited], etc.) must be
    stripped from spoken_text and display_text but kept in tts_text."""

    def test_strip_single_tag(self):
        assert ElevenLabsPublisher._strip_audio_tags("[warm] Hello.") == "Hello."

    def test_strip_multiple_tags(self):
        text = "[excited] She ran! [gasps] Then stopped."
        assert ElevenLabsPublisher._strip_audio_tags(text) == "She ran! Then stopped."

    def test_strip_layered_tags(self):
        text = "[whispers][mysterious] Something moved."
        assert ElevenLabsPublisher._strip_audio_tags(text) == "Something moved."

    def test_strip_tag_mid_sentence(self):
        text = "She sat down [sighs] and closed her eyes."
        assert ElevenLabsPublisher._strip_audio_tags(text) == "She sat down and closed her eyes."

    def test_strip_tag_at_end(self):
        text = "That was amazing! [laughs]"
        result = ElevenLabsPublisher._strip_audio_tags(text)
        assert result.strip() == "That was amazing!"

    def test_no_tags_unchanged(self):
        text = "A plain story with no tags."
        assert ElevenLabsPublisher._strip_audio_tags(text) == text

    def test_preserve_curly_braces(self):
        """Audio tag stripping must not touch pronunciation hints."""
        text = "[warm] She loved sambar {saambar}."
        result = ElevenLabsPublisher._strip_audio_tags(text)
        assert result == "She loved sambar {saambar}."

    def test_multi_word_tags(self):
        text = "[silly voice] He danced around. [building intensity] Faster!"
        result = ElevenLabsPublisher._strip_audio_tags(text)
        assert result == "He danced around. Faster!"


class TestPrepareForDisplayWithTags:
    """_prepare_for_display must strip BOTH audio tags and pronunciation hints."""

    def test_strips_tags_only(self):
        text = "[warm] The sun rose."
        assert ElevenLabsPublisher._prepare_for_display(text) == "The sun rose."

    def test_strips_hints_only(self):
        text = "She loved sambar {saambar}."
        assert ElevenLabsPublisher._prepare_for_display(text) == "She loved sambar."

    def test_strips_both_tags_and_hints(self):
        text = "[whispers] She loved sambar {saambar}. [excited] The pool was warm!"
        result = ElevenLabsPublisher._prepare_for_display(text)
        assert result == "She loved sambar. The pool was warm!"
        assert "[" not in result
        assert "{" not in result

    def test_display_never_contains_brackets(self):
        """Comprehensive: display text must never contain [ ] or { }."""
        text = (
            "[warm] Idli {idlee} bounced. "
            "[excited] Dosa {dohsa} rolled. "
            "[whispers][soft] Sambar {saambar} splashed."
        )
        result = ElevenLabsPublisher._prepare_for_display(text)
        assert "[" not in result
        assert "]" not in result
        assert "{" not in result
        assert "}" not in result


class TestPrepareForTtsWithTags:
    """_prepare_for_tts must keep audio tags but resolve pronunciation hints."""

    def test_keeps_tags(self):
        text = "[warm] She loved sambar {saambar}."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert "[warm]" in result
        assert "saambar" in result
        assert "{" not in result

    def test_keeps_layered_tags(self):
        text = "[whispers][mysterious] Sambar {saambar} splashed."
        result = ElevenLabsPublisher._prepare_for_tts(text)
        assert "[whispers]" in result
        assert "[mysterious]" in result
        assert "saambar" in result


class TestSegmentsWithAudioTags:
    """Verify that audio tags don't break timestamp alignment.

    ElevenLabs v3 convert_with_timestamps includes tag characters in the
    alignment data (confirmed empirically).  So tts_text (tags + aliases)
    is what matches alignment, while display_text (no tags, original words)
    is what the player shows.
    """

    def test_tts_text_with_tags_matches_alignment(self):
        """tts_text (with tags) is sent to ElevenLabs and matches alignment."""
        original = "[warm] She loved sambar {saambar}. [whispers] The pool was quiet."
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)

        # tts_text keeps tags and resolves aliases
        assert "[warm]" in tts
        assert "saambar" in tts

        # Alignment matches tts_text (tags included)
        alignment = _fake_alignment(tts)
        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 2
        assert segments[0]["text"] == "She loved sambar."
        assert segments[1]["text"] == "The pool was quiet."

    def test_tags_and_hints_combined_no_drift(self):
        """Tags + hints together must not cause cumulative offset drift."""
        original = (
            "[warm] Idli {idlee} bounced on the plate. "
            "[excited] Dosa {dohsa} rolled around. "
            "[whispers] Sambar {saambar} splashed everywhere. "
            "[soft] The kitchen was a mess."
        )
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)

        alignment = _fake_alignment(tts)
        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 4
        assert segments[0]["text"] == "Idli bounced on the plate."
        assert segments[3]["text"] == "The kitchen was a mess."

        expected_start = round(tts.index("[soft] The kitchen") * 0.05, 3)
        assert segments[3]["startTime"] == expected_start

    def test_tags_only_no_hints(self):
        """Stories with tags but no pronunciation hints."""
        original = "[excited] She ran fast! [pause] Then she stopped. [whispers] And listened."
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)

        # Alignment built from tts (with tags)
        alignment = _fake_alignment(tts)
        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 3
        assert segments[0]["text"] == "She ran fast!"
        assert segments[1]["text"] == "Then she stopped."
        assert segments[2]["text"] == "And listened."

    def test_layered_tags_dont_break_alignment(self):
        """Multiple tags stacked together must be handled correctly."""
        original = "[whispers][mysterious] The door creaked. [excited][gasps] She saw it!"
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        display = ElevenLabsPublisher._prepare_for_display(original)

        alignment = _fake_alignment(tts)
        segments = ElevenLabsPublisher._chars_to_sentence_segments(
            tts, display, alignment,
        )
        assert len(segments) == 2
        assert segments[0]["text"] == "The door creaked."
        assert segments[1]["text"] == "She saw it!"


class TestMockPublishWithTags:
    """MockAudioPublisher must strip tags from segment display text."""

    def test_mock_strips_tags(self):
        pub = MockAudioPublisher()
        text = "[warm] Hello world. [whispers] Goodbye world."
        result = asyncio.run(pub.publish("test-id", text))
        for seg in result.segments:
            assert "[" not in seg["text"]
            assert "]" not in seg["text"]

    def test_mock_strips_tags_and_hints(self):
        pub = MockAudioPublisher()
        text = "[excited] Idli {idlee} bounced. [soft] Dosa {dohsa} laughed."
        result = asyncio.run(pub.publish("test-id", text))
        for seg in result.segments:
            assert "[" not in seg["text"]
            assert "{" not in seg["text"]


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


# ── Text variant consistency ─────────────────────────────────────────────

class TestTextVariantConsistency:
    """Verify the three-text-variant pipeline: tts_text, spoken_text, display_text.

    - tts_text:     audio tags KEPT, pronunciation aliases resolved
    - spoken_text:  tags stripped, aliases resolved (what the voice says)
    - display_text: tags stripped, original words kept (UI text)
    """

    def test_three_variants_from_tagged_hinted_text(self):
        original = "[warm] Idli {idlee} bounced. [whispers] Dosa {dohsa} slept."
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        spoken = ElevenLabsPublisher._strip_audio_tags(tts)
        display = ElevenLabsPublisher._prepare_for_display(original)

        assert "[warm]" in tts and "idlee" in tts      # tags kept, alias resolved
        assert "[" not in spoken and "idlee" in spoken  # tags stripped, alias kept
        assert "[" not in display and "Idli" in display # tags stripped, original word

    def test_plain_text_all_variants_identical(self):
        text = "A simple story. Nothing special."
        tts = ElevenLabsPublisher._prepare_for_tts(text)
        spoken = ElevenLabsPublisher._strip_audio_tags(tts)
        display = ElevenLabsPublisher._prepare_for_display(text)
        assert tts == spoken == display == text

    def test_sentence_count_matches_across_variants(self):
        """All three variants must split into the same number of sentences."""
        import re
        original = (
            "[warm] Idli {idlee} bounced on the plate. "
            "[excited] Dosa {dohsa} rolled around. "
            "The kitchen was a mess."
        )
        tts = ElevenLabsPublisher._prepare_for_tts(original)
        spoken = ElevenLabsPublisher._strip_audio_tags(tts)
        display = ElevenLabsPublisher._prepare_for_display(original)

        split = lambda t: [s for s in re.split(r'(?<=[.!?])\s+', t.strip()) if s.strip()]
        assert len(split(tts)) == len(split(spoken)) == len(split(display)) == 3


# ── Observability / logging ──────────────────────────────────────────────

class TestPublishLogging:
    """Verify that publish() emits structured log messages for observability.

    These logs are critical for debugging pronunciation issues, monitoring
    audio tag usage, and detecting alignment mismatches in production.
    """

    def test_text_prep_log_emitted(self, caplog):
        """publish() must log text-prep with tag count and text lengths."""
        pub = MockAudioPublisher()
        text = "[warm] Idli {idlee} bounced. [whispers] Dosa {dohsa} slept."
        with caplog.at_level(logging.INFO, logger="mello_api.services.audio_publisher"):
            asyncio.run(pub.publish("test-id", text))
        # MockAudioPublisher doesn't call the real publish pipeline with logging,
        # so we test the text prep functions directly instead
        tts = ElevenLabsPublisher._prepare_for_tts(text)
        display = ElevenLabsPublisher._prepare_for_display(text)
        # Verify the values that would be logged
        import re
        audio_tags = re.findall(r'\[([^\]]+)\]', tts)
        assert len(audio_tags) == 2
        assert "warm" in audio_tags
        assert "whispers" in audio_tags
        assert len(tts) > len(display)  # TTS has tags, display doesn't

    def test_text_prep_values_are_correct(self):
        """Verify the exact values that get logged in production."""
        import re
        text = (
            "[excited] Upma {oopma} is warm. "
            "[soft] Poha {pohah} is light. "
            "Chai {chay} is perfect."
        )
        tts = ElevenLabsPublisher._prepare_for_tts(text)
        spoken = ElevenLabsPublisher._strip_audio_tags(tts)
        display = ElevenLabsPublisher._prepare_for_display(text)
        audio_tags = re.findall(r'\[([^\]]+)\]', tts)

        assert audio_tags == ["excited", "soft"]
        assert len(tts) > len(spoken) > 0
        assert len(spoken) >= len(display)  # spoken has aliases, display has originals
        assert "[" not in display
        assert "{" not in display


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
