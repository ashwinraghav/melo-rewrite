from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class UserProfile(CamelModel):
    uid: str
    email: str
    display_name: str | None
    child_age: int | None
    preferred_topics: list[str]
    created_at: str
    updated_at: str


class UpdateProfileBody(CamelModel):
    """Request body for PATCH /v1/me. All fields are optional."""
    child_age: int | None = Field(default=None, ge=1, le=12)
    preferred_topics: list[str] | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
