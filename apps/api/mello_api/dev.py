"""
Local development entry point: uvicorn mello_api.dev:app --reload --port 8080
Uses in-memory repositories with seed data — no GCP credentials needed.
"""
from .main import create_app
from .repositories.memory import create_memory_repositories, MemoryStoryRepository
from .models.story import Story

_NOW = "2024-01-01T00:00:00+00:00"

SEED_STORIES = [
    Story(
        id="story-animals",
        title="The Sleepy Fox",
        description="A fox finds a cozy den for the night.",
        duration_seconds=180,
        duration_category="short",
        age_min=2, age_max=6,
        topics=["animals", "nature"],
        audio_path="stories/story-animals/audio.mp3",
        cover_art_path="stories/story-animals/cover.webp",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="story-space",
        title="Stars at Bedtime",
        description="A journey through the night sky.",
        duration_seconds=480,
        duration_category="medium",
        age_min=4, age_max=10,
        topics=["space", "science"],
        audio_path="stories/story-space/audio.mp3",
        cover_art_path="stories/story-space/cover.webp",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="story-friendship",
        title="The Long Walk Home",
        description="Two friends help each other through the forest.",
        duration_seconds=1200,
        duration_category="long",
        age_min=5, age_max=12,
        topics=["friendship", "nature"],
        audio_path="stories/story-friendship/audio.mp3",
        cover_art_path="stories/story-friendship/cover.webp",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="story-ocean",
        title="Waves and Whales",
        description="Listen to the ocean sing you to sleep.",
        duration_seconds=360,
        duration_category="medium",
        age_min=2, age_max=8,
        topics=["animals", "nature", "ocean"],
        audio_path="stories/story-ocean/audio.mp3",
        cover_art_path="stories/story-ocean/cover.webp",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
]

repos = create_memory_repositories()
assert isinstance(repos.stories, MemoryStoryRepository)
repos.stories.seed(SEED_STORIES)

app = create_app(repos=repos, cors_origins=["http://localhost:3000"])
