from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING
from ..models.story import Story, StoryFilters
from ..models.user import UserProfile
from ..models.listening import Favorite, HistoryEntry
from ..models.voice import Voice, VoiceInvite, Conversion

if TYPE_CHECKING:
    from ..services.story_generator import StoryGeneratorService
    from ..services.audio_publisher import AudioPublisherService
    from ..services.cover_generator import CoverGeneratorService
    from ..services.embedding import EmbeddingService
    from ..services.search import SearchService
    from ..services.voice_cloner import VoiceClonerService
    from ..services.catalog_publisher import CatalogPublisherService
    from ..services.task_queue import TaskQueueService


class StoryRepository(ABC):
    @abstractmethod
    def find_by_id(self, story_id: str) -> Story | None: ...

    @abstractmethod
    def find_by_id_any(self, story_id: str) -> Story | None:
        """Find by ID regardless of publish state. Used by creator endpoints."""
        ...

    @abstractmethod
    def find_many(self, filters: StoryFilters) -> list[Story]: ...

    @abstractmethod
    def create(self, story: Story) -> Story: ...

    @abstractmethod
    def update(self, story_id: str, data: dict) -> Story | None: ...

    @abstractmethod
    def get_audio_signed_url(self, story_id: str, audio_path: str) -> str: ...

    @abstractmethod
    def get_cover_art_signed_url(self, story_id: str, cover_art_path: str) -> str: ...

    @abstractmethod
    def get_cover_art_public_url(self, cover_art_path: str) -> str: ...

    @abstractmethod
    def get_audio_public_url(self, audio_path: str) -> str: ...


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


class VoiceRepository(ABC):
    @abstractmethod
    def find_by_id(self, uid: str, voice_id: str) -> Voice | None: ...

    @abstractmethod
    def find_all(self, uid: str) -> list[Voice]: ...

    @abstractmethod
    def create(self, uid: str, voice: Voice) -> Voice: ...

    @abstractmethod
    def update(self, uid: str, voice_id: str, data: dict) -> Voice | None: ...

    @abstractmethod
    def delete(self, uid: str, voice_id: str) -> None: ...

    @abstractmethod
    def count(self, uid: str) -> int: ...


class VoiceInviteRepository(ABC):
    @abstractmethod
    def find_by_token(self, token: str) -> VoiceInvite | None: ...

    @abstractmethod
    def create(self, invite: VoiceInvite) -> VoiceInvite: ...

    @abstractmethod
    def mark_used(self, token: str, voice_id: str) -> VoiceInvite | None: ...


class ConversionRepository(ABC):
    @abstractmethod
    def find_by_id(self, uid: str, story_id: str, voice_id: str) -> Conversion | None: ...

    @abstractmethod
    def find_all_for_story(self, uid: str, story_id: str) -> list[Conversion]: ...

    @abstractmethod
    def create(self, uid: str, conversion: Conversion) -> Conversion: ...

    @abstractmethod
    def update(self, uid: str, story_id: str, voice_id: str, data: dict) -> Conversion | None: ...


@dataclass
class Repositories:
    stories: StoryRepository
    users: UserRepository
    favorites: FavoriteRepository
    history: HistoryRepository
    voices: VoiceRepository
    voice_invites: VoiceInviteRepository
    conversions: ConversionRepository


@dataclass
class Services:
    story_generator: StoryGeneratorService
    audio_publisher: AudioPublisherService
    cover_generator: CoverGeneratorService
    embedding: EmbeddingService
    search: SearchService
    voice_cloner: VoiceClonerService
    catalog_publisher: CatalogPublisherService
    task_queue: TaskQueueService
