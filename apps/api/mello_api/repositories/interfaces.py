from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from ..models.story import Story, StoryFilters
from ..models.user import UserProfile
from ..models.listening import Favorite, HistoryEntry


class StoryRepository(ABC):
    @abstractmethod
    def find_by_id(self, story_id: str) -> Story | None: ...

    @abstractmethod
    def find_many(self, filters: StoryFilters) -> list[Story]: ...

    @abstractmethod
    def get_audio_signed_url(self, story_id: str, audio_path: str) -> str: ...

    @abstractmethod
    def get_cover_art_signed_url(self, story_id: str, cover_art_path: str) -> str: ...


class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, uid: str) -> UserProfile | None: ...

    @abstractmethod
    def create(self, profile: UserProfile) -> UserProfile: ...

    @abstractmethod
    def update(self, uid: str, data: dict) -> UserProfile: ...


class FavoriteRepository(ABC):
    @abstractmethod
    def find_all(self, uid: str) -> list[Favorite]: ...

    @abstractmethod
    def add(self, uid: str, story_id: str) -> Favorite: ...

    @abstractmethod
    def remove(self, uid: str, story_id: str) -> None: ...

    @abstractmethod
    def exists(self, uid: str, story_id: str) -> bool: ...


class HistoryRepository(ABC):
    @abstractmethod
    def find_all(self, uid: str) -> list[HistoryEntry]: ...

    @abstractmethod
    def upsert(self, uid: str, story_id: str, progress_seconds: int, completed: bool) -> HistoryEntry: ...


@dataclass
class Repositories:
    stories: StoryRepository
    users: UserRepository
    favorites: FavoriteRepository
    history: HistoryRepository
