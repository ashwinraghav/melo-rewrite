"""
Local development entry point: uvicorn mello_api.dev:app --reload --port 8080
Uses in-memory repositories with seed data from the Stitch mocks.
"""
from .main import create_app
from .repositories.memory import create_memory_repositories, MemoryStoryRepository
from .models.story import Story

_NOW = "2024-01-01T00:00:00+00:00"

SEED_STORIES = [
    Story(id="the-whispering-pines", title="The Whispering Pines",
          description="Tall trees share their softest secrets as the forest settles in for the night.",
          duration_seconds=480, duration_category="medium", age_min=2, age_max=8,
          topics=["nature"], audio_path="stories/the-whispering-pines/audio.mp3",
          cover_art_path="stories/the-whispering-pines/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="stardust-journey", title="Stardust Journey",
          description="Float among the friendly stars on a gentle ride across the galaxy.",
          duration_seconds=720, duration_category="medium", age_min=4, age_max=10,
          topics=["space"], audio_path="stories/stardust-journey/audio.mp3",
          cover_art_path="stories/stardust-journey/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="the-moons-nightcap", title="The Moon's Nightcap",
          description="A gentle tale of how the moon prepares for its nightly shift.",
          duration_seconds=300, duration_category="short", age_min=2, age_max=6,
          topics=["space", "nature"], audio_path="stories/the-moons-nightcap/audio.mp3",
          cover_art_path="stories/the-moons-nightcap/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="bubbles-and-the-deep-blue", title="Bubbles & The Deep Blue",
          description="A peaceful swim through coral reefs with the friendliest fish in the sea.",
          duration_seconds=600, duration_category="medium", age_min=3, age_max=8,
          topics=["ocean", "animals"], audio_path="stories/bubbles-and-the-deep-blue/audio.mp3",
          cover_art_path="stories/bubbles-and-the-deep-blue/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="the-teacup-dragon", title="The Teacup Dragon",
          description="A tiny dragon discovers that the smallest creatures can have the warmest hearts.",
          duration_seconds=420, duration_category="medium", age_min=3, age_max=9,
          topics=["magic", "friendship"], audio_path="stories/the-teacup-dragon/audio.mp3",
          cover_art_path="stories/the-teacup-dragon/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="sleepy-kittens", title="Sleepy Kittens",
          description="Three fluffy kittens find the perfect spot to curl up together.",
          duration_seconds=240, duration_category="short", age_min=2, age_max=5,
          topics=["animals"], audio_path="stories/sleepy-kittens/audio.mp3",
          cover_art_path="stories/sleepy-kittens/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="kind-adventures", title="Kind Adventures",
          description="New pals discover that the best adventures are the ones shared with friends.",
          duration_seconds=900, duration_category="long", age_min=5, age_max=12,
          topics=["friendship"], audio_path="stories/kind-adventures/audio.mp3",
          cover_art_path="stories/kind-adventures/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
]

repos = create_memory_repositories()
assert isinstance(repos.stories, MemoryStoryRepository)
repos.stories.seed(SEED_STORIES)

app = create_app(repos=repos, cors_origins=["http://localhost:3000"])
