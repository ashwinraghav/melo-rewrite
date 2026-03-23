from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

COMPLETION_THRESHOLD = 0.9


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Favorite(CamelModel):
    user_id: str
    story_id: str
    created_at: str


class HistoryEntry(CamelModel):
    user_id: str
    story_id: str
    progress_seconds: int
    completed: bool
    last_played_at: str
