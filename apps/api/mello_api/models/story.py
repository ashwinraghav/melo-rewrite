from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

StoryDuration = Literal["short", "medium", "long"]

DURATION_THRESHOLDS = {"short_max": 299, "medium_max": 899}


def categorize_duration(seconds: int) -> StoryDuration:
    if seconds <= DURATION_THRESHOLDS["short_max"]:
        return "short"
    if seconds <= DURATION_THRESHOLDS["medium_max"]:
        return "medium"
    return "long"


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


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
    is_published: bool
    created_at: str
    updated_at: str


class StoryFilters(BaseModel):
    topics: list[str] | None = None
    child_age: int | None = None
    duration: StoryDuration | None = None
