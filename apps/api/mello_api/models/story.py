from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

StoryDuration = Literal["short", "medium", "long"]
StorySource = Literal["curated", "user"]
PublishStatus = Literal["idle", "processing", "ready", "failed"]
GenerateStatus = Literal["idle", "processing", "ready", "failed"]

DURATION_THRESHOLDS = {"short_max": 299, "medium_max": 899}


def categorize_duration(seconds: int) -> StoryDuration:
    if seconds <= DURATION_THRESHOLDS["short_max"]:
        return "short"
    if seconds <= DURATION_THRESHOLDS["medium_max"]:
        return "medium"
    return "long"


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StorySegment(CamelModel):
    text: str
    start_time: float
    end_time: float


class Story(CamelModel):
    id: str
    title: str
    description: str
    duration_seconds: int
    duration_category: StoryDuration
    age_min: int
    age_max: int
    topics: list[str]
    audio_path: str
    cover_art_path: str
    story_text: str = ""
    segments: list[StorySegment] = []
    themes: str = ""
    embedding: list[float] = []
    source: StorySource = "curated"
    generate_status: GenerateStatus = "idle"
    generate_error: str = ""
    publish_status: PublishStatus = "idle"
    publish_step: str = ""
    publish_error: str = ""
    is_published: bool
    created_at: str
    updated_at: str


class StoryWithAudioUrl(CamelModel):
    id: str
    title: str
    description: str
    duration_seconds: int
    duration_category: StoryDuration
    age_min: int
    age_max: int
    topics: list[str]
    audio_url: str
    cover_art_url: str
    story_text: str | None = None
    segments: list[StorySegment] | None = None
    source: StorySource = "curated"
    generate_status: GenerateStatus = "idle"
    generate_error: str = ""
    publish_status: PublishStatus = "idle"
    publish_step: str = ""
    publish_error: str = ""
    is_published: bool
    created_at: str
    updated_at: str


class StoryFilters(BaseModel):
    topics: list[str] | None = None
    child_age: int | None = None
    duration: StoryDuration | None = None


class GenerateStoryRequest(CamelModel):
    prompt: str


class GenerateStoryResponse(CamelModel):
    id: str
    title: str
    description: str
    story_text: str
    topics: list[str]
    age_min: int
    age_max: int
    created_at: str


class UpdateDraftRequest(CamelModel):
    title: str | None = None
    description: str | None = None
    story_text: str | None = None
    topics: list[str] | None = None
    age_min: int | None = None
    age_max: int | None = None


class SearchStoriesRequest(CamelModel):
    query: str
    child_age: int | None = None
    limit: int = 10
