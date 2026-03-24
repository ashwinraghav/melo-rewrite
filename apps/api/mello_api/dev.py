"""
Local development entry point: uvicorn mello_api.dev:app --reload --port 8080
Uses in-memory repositories with seed data matching Stitch mocks.
"""
from .main import create_app
from .repositories.memory import create_memory_repositories, MemoryStoryRepository
from .models.story import Story

_NOW = "2024-01-01T00:00:00+00:00"

SEED_STORIES = [
    Story(id="the-whispering-pines", title="The Whispering Pines",
          description="Tall trees share their softest secrets as the park settles in for the evening.",
          duration_seconds=480, duration_category="medium", age_min=2, age_max=8,
          topics=["park"], audio_path="stories/the-whispering-pines/audio.mp3",
          cover_art_path="stories/the-whispering-pines/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="sharing-is-caring", title="Sharing is Caring",
          description="Two new friends learn that sharing toys makes playtime twice as fun.",
          duration_seconds=300, duration_category="short", age_min=2, age_max=6,
          topics=["friends"], audio_path="stories/sharing-is-caring/audio.mp3",
          cover_art_path="stories/sharing-is-caring/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="the-moons-nightcap", title="The Moon's Nightcap",
          description="A gentle tale of brushing teeth, warm pajamas, and cozy blankets.",
          duration_seconds=300, duration_category="short", age_min=2, age_max=6,
          topics=["bedtime"], audio_path="stories/the-moons-nightcap/audio.mp3",
          cover_art_path="stories/the-moons-nightcap/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="rainbow-bites", title="Rainbow Bites",
          description="Discovering delicious flavors and colorful treats at the kitchen table.",
          duration_seconds=420, duration_category="medium", age_min=2, age_max=7,
          topics=["food"], audio_path="stories/rainbow-bites/audio.mp3",
          cover_art_path="stories/rainbow-bites/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="playground-friends", title="Playground Friends",
          description="A sunny afternoon at the park where everyone finds someone to play with.",
          duration_seconds=600, duration_category="medium", age_min=3, age_max=8,
          topics=["park", "friends"], audio_path="stories/playground-friends/audio.mp3",
          cover_art_path="stories/playground-friends/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="sleepy-bear", title="Sleepy Bear's Bedtime",
          description="Follow little bear through his bedtime routine — bath, story, and a big yawn.",
          duration_seconds=900, duration_category="long", age_min=2, age_max=5,
          topics=["bedtime"], audio_path="stories/sleepy-bear/audio.mp3",
          cover_art_path="stories/sleepy-bear/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
    Story(id="picnic-adventure", title="The Picnic Adventure",
          description="Packing sandwiches and finding the perfect spot under a big shady tree.",
          duration_seconds=480, duration_category="medium", age_min=3, age_max=9,
          topics=["park", "food"], audio_path="stories/picnic-adventure/audio.mp3",
          cover_art_path="stories/picnic-adventure/cover.webp",
          is_published=True, created_at=_NOW, updated_at=_NOW),
]

repos = create_memory_repositories()
assert isinstance(repos.stories, MemoryStoryRepository)
repos.stories.seed(SEED_STORIES)

app = create_app(repos=repos, cors_origins=["http://localhost:3000"])
