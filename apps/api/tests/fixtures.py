"""Shared test data — matches the Stitch Editorial Serenity mock topics."""
from mello_api.models.story import Story
from mello_api.services.embedding import MockEmbeddingService

_NOW = "2024-01-01T00:00:00+00:00"
_EMB = MockEmbeddingService()


STORIES = [
    Story(
        id="the-whispering-pines",
        title="The Whispering Pines",
        description="Tall trees share their softest secrets as the park settles in for the evening.",
        duration_seconds=480, duration_category="medium",
        age_min=2, age_max=8, topics=["park"],
        audio_path="stories/the-whispering-pines/audio.mp3",
        cover_art_path="stories/the-whispering-pines/cover.webp",
        themes="This story explores listening to nature, finding calm in outdoor spaces, and the peaceful feeling of being among tall trees at dusk.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="sharing-is-caring",
        title="Sharing is Caring",
        description="Two new friends learn that sharing toys makes playtime twice as fun.",
        duration_seconds=300, duration_category="short",
        age_min=2, age_max=6, topics=["friends"],
        audio_path="stories/sharing-is-caring/audio.mp3",
        cover_art_path="stories/sharing-is-caring/cover.webp",
        themes="This story addresses sibling rivalry, jealousy over toys, and learning to share with others. It helps children understand that generosity creates stronger friendships and that sharing doesn't mean losing something — it means gaining a friend.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="the-moons-nightcap",
        title="The Moon's Nightcap",
        description="A gentle tale of brushing teeth, warm pajamas, and cozy blankets.",
        duration_seconds=300, duration_category="short",
        age_min=2, age_max=6, topics=["bedtime"],
        audio_path="stories/the-moons-nightcap/audio.mp3",
        cover_art_path="stories/the-moons-nightcap/cover.webp",
        themes="This story helps with bedtime resistance and establishing a calming nighttime routine. It addresses fear of the dark, separation anxiety at bedtime, and the comfort of familiar rituals like brushing teeth and being tucked in.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="rainbow-bites",
        title="Rainbow Bites",
        description="Discovering delicious flavors and colorful treats at the kitchen table.",
        duration_seconds=420, duration_category="medium",
        age_min=2, age_max=7, topics=["food"],
        audio_path="stories/rainbow-bites/audio.mp3",
        cover_art_path="stories/rainbow-bites/cover.webp",
        themes="This story tackles picky eating and food anxiety. It encourages children to try new foods by framing each color as an adventure, helping with mealtime struggles and building a positive relationship with healthy eating.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="playground-friends",
        title="Playground Friends",
        description="A sunny afternoon at the park where everyone finds someone to play with.",
        duration_seconds=600, duration_category="medium",
        age_min=3, age_max=8, topics=["park", "friends"],
        audio_path="stories/playground-friends/audio.mp3",
        cover_art_path="stories/playground-friends/cover.webp",
        themes="This story addresses social anxiety and difficulty making friends. It shows that everyone feels nervous approaching new people, and that simple acts of kindness — like asking someone to play — can blossom into wonderful friendships.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="sleepy-bear",
        title="Sleepy Bear's Bedtime",
        description="Follow little bear through his bedtime routine — bath, story, and a big yawn.",
        duration_seconds=900, duration_category="long",
        age_min=2, age_max=5, topics=["bedtime"],
        audio_path="stories/sleepy-bear/audio.mp3",
        cover_art_path="stories/sleepy-bear/cover.webp",
        themes="This story helps with resistance to sleep and bedtime procrastination. It normalizes feeling sleepy, shows a comforting bath-to-bed routine, and addresses the fear of missing out that makes children resist bedtime.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="picnic-adventure",
        title="The Picnic Adventure",
        description="Packing sandwiches and finding the perfect spot under a big shady tree.",
        duration_seconds=480, duration_category="medium",
        age_min=3, age_max=9, topics=["park", "food"],
        audio_path="stories/picnic-adventure/audio.mp3",
        cover_art_path="stories/picnic-adventure/cover.webp",
        themes="This story teaches planning, patience, and the joy of simple outdoor activities with family. It addresses the need for quality family time and shows that happiness comes from togetherness, not material things.",
        is_published=True, created_at=_NOW, updated_at=_NOW,
    ),
    Story(
        id="story-unpublished",
        title="Draft Story",
        description="Not ready yet.",
        duration_seconds=60, duration_category="short",
        age_min=1, age_max=12, topics=["park"],
        audio_path="stories/story-unpublished/audio.mp3",
        cover_art_path="stories/story-unpublished/cover.webp",
        is_published=False, created_at=_NOW, updated_at=_NOW,
    ),
]

# Generate embeddings for stories that have themes (using sync helper)
for _s in STORIES:
    if _s.themes:
        _s.embedding = _EMB.embed_story_sync(_s)

USER_ALICE = "uid-alice"
USER_BOB = "uid-bob"
