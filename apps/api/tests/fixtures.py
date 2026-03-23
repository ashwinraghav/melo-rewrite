"""Shared test data: 4 stories, 2 users."""
from datetime import datetime, timezone
from mello_api.models.story import Story, categorize_duration

_NOW = "2024-01-01T00:00:00+00:00"

STORIES = [
    Story(
        id="story-animals",
        title="The Sleepy Fox",
        description="A fox finds a cozy den for the night.",
        duration_seconds=180,  # short
        duration_category="short",
        age_min=2,
        age_max=6,
        topics=["animals", "nature"],
        audio_path="stories/story-animals/audio.mp3",
        cover_art_path="stories/story-animals/cover.webp",
        is_published=True,
        created_at=_NOW,
        updated_at=_NOW,
    ),
    Story(
        id="story-space",
        title="Stars at Bedtime",
        description="A journey through the night sky.",
        duration_seconds=480,  # medium
        duration_category="medium",
        age_min=4,
        age_max=10,
        topics=["space", "science"],
        audio_path="stories/story-space/audio.mp3",
        cover_art_path="stories/story-space/cover.webp",
        is_published=True,
        created_at=_NOW,
        updated_at=_NOW,
    ),
    Story(
        id="story-friendship",
        title="The Long Walk Home",
        description="Two friends help each other through the forest.",
        duration_seconds=1200,  # long
        duration_category="long",
        age_min=5,
        age_max=12,
        topics=["friendship", "nature"],
        audio_path="stories/story-friendship/audio.mp3",
        cover_art_path="stories/story-friendship/cover.webp",
        is_published=True,
        created_at=_NOW,
        updated_at=_NOW,
    ),
    Story(
        id="story-unpublished",
        title="Draft Story",
        description="Not ready yet.",
        duration_seconds=60,
        duration_category="short",
        age_min=1,
        age_max=12,
        topics=["animals"],
        audio_path="stories/story-unpublished/audio.mp3",
        cover_art_path="stories/story-unpublished/cover.webp",
        is_published=False,
        created_at=_NOW,
        updated_at=_NOW,
    ),
]

USER_ALICE = "uid-alice"
USER_BOB = "uid-bob"
