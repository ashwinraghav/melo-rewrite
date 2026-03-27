"""
Business metric instruments for Mello API.

Safe to import unconditionally — when no MeterProvider is set (dev/test),
all instruments return no-op instances that accept calls silently.
"""
from opentelemetry import metrics

meter = metrics.get_meter("mello_api")

# ── Counters ──────────────────────────────────────────────────────────────────

stories_generated = meter.create_counter(
    name="mello.stories.generated",
    description="Total stories generated via Claude",
    unit="1",
)

stories_published = meter.create_counter(
    name="mello.stories.published",
    description="Total stories published (audio + cover + embedding)",
    unit="1",
)

searches_performed = meter.create_counter(
    name="mello.searches.performed",
    description="Total semantic search queries",
    unit="1",
)

voice_clones_completed = meter.create_counter(
    name="mello.voice_clones.completed",
    description="Total voice cloning operations completed",
    unit="1",
)

# ── Histograms ────────────────────────────────────────────────────────────────

story_generation_duration = meter.create_histogram(
    name="mello.story.generation.duration",
    description="Time to generate a story via Claude API",
    unit="s",
)

story_publish_duration = meter.create_histogram(
    name="mello.story.publish.duration",
    description="Time to publish a story (audio + cover + embedding + catalog)",
    unit="s",
)
