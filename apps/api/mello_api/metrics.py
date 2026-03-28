"""
Business and client metric instruments for Mello API.

Safe to import unconditionally — when no MeterProvider is set (dev/test),
all instruments return no-op instances that accept calls silently.
"""
from opentelemetry import metrics

meter = metrics.get_meter("mello_api")

# ── Business counters ────────────────────────────────────────────────────────

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

# ── Business histograms ──────────────────────────────────────────────────────

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

# ── Per-client duration histograms ───────────────────────────────────────────

gcs_operation_duration = meter.create_histogram(
    name="mello.gcs.duration",
    description="GCS operation duration (upload/download)",
    unit="s",
)

anthropic_request_duration = meter.create_histogram(
    name="mello.anthropic.duration",
    description="Anthropic Claude API request duration",
    unit="s",
)

genai_request_duration = meter.create_histogram(
    name="mello.genai.duration",
    description="Google GenAI (Imagen/Embeddings) request duration",
    unit="s",
)

cohere_request_duration = meter.create_histogram(
    name="mello.cohere.duration",
    description="Cohere rerank API request duration",
    unit="s",
)

elevenlabs_request_duration = meter.create_histogram(
    name="mello.elevenlabs.duration",
    description="ElevenLabs API request duration",
    unit="s",
)

# ── Per-client error counters ────────────────────────────────────────────────

gcs_errors = meter.create_counter(
    name="mello.gcs.errors",
    description="GCS operation errors",
    unit="1",
)

anthropic_errors = meter.create_counter(
    name="mello.anthropic.errors",
    description="Anthropic Claude API errors",
    unit="1",
)

genai_errors = meter.create_counter(
    name="mello.genai.errors",
    description="Google GenAI errors",
    unit="1",
)

cohere_errors = meter.create_counter(
    name="mello.cohere.errors",
    description="Cohere API errors",
    unit="1",
)

elevenlabs_errors = meter.create_counter(
    name="mello.elevenlabs.errors",
    description="ElevenLabs API errors",
    unit="1",
)
