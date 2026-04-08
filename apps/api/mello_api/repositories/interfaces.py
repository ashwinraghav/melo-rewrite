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
    from ..services.pronunciation import PronunciationService


class StoryRepository(ABC):
    @abstractmethod
    async def find_by_id(self, story_id: str) -> Story | None: ...

    @abstractmethod
    async def find_by_id_any(self, story_id: str) -> Story | None:
        """Find by ID regardless of publish state. Used by creator endpoints."""
        ...

    @abstractmethod
    async def find_many(self, filters: StoryFilters) -> list[Story]: ...

    @abstractmethod
    async def vector_search(self, query_embedding: list[float], limit: int = 20) -> list[tuple[Story, float]]:
        """KNN vector search on the embedding field. Returns (story, distance) pairs."""
        ...

    @abstractmethod
    async def create(self, story: Story) -> Story: ...

    @abstractmethod
    async def update(self, story_id: str, data: dict) -> Story | None: ...

    @abstractmethod
    async def get_audio_signed_url(self, story_id: str, audio_path: str) -> str: ...

    @abstractmethod
    async def get_cover_art_signed_url(self, story_id: str, cover_art_path: str) -> str: ...

    @abstractmethod
    async def get_cover_art_public_url(self, cover_art_path: str) -> str: ...

    @abstractmethod
    async def get_audio_public_url(self, audio_path: str) -> str: ...

    @abstractmethod
    async def delete(self, story_id: str) -> None: ...


class UserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, uid: str) -> UserProfile | None: ...

    @abstractmethod
    async def create(self, profile: UserProfile) -> UserProfile: ...

    @abstractmethod
    async def update(self, uid: str, data: dict) -> UserProfile: ...


class FavoriteRepository(ABC):
    @abstractmethod
    async def find_all(self, uid: str) -> list[Favorite]: ...

    @abstractmethod
    async def add(self, uid: str, story_id: str) -> Favorite: ...

    @abstractmethod
    async def remove(self, uid: str, story_id: str) -> None: ...

    @abstractmethod
    async def exists(self, uid: str, story_id: str) -> bool: ...


class HistoryRepository(ABC):
    @abstractmethod
    async def find_all(self, uid: str) -> list[HistoryEntry]: ...

    @abstractmethod
    async def upsert(self, uid: str, story_id: str, progress_seconds: int, completed: bool) -> HistoryEntry: ...


class VoiceRepository(ABC):
    @abstractmethod
    async def find_by_id(self, uid: str, voice_id: str) -> Voice | None: ...

    @abstractmethod
    async def find_all(self, uid: str) -> list[Voice]: ...

    @abstractmethod
    async def create(self, uid: str, voice: Voice) -> Voice: ...

    @abstractmethod
    async def update(self, uid: str, voice_id: str, data: dict) -> Voice | None: ...

    @abstractmethod
    async def delete(self, uid: str, voice_id: str) -> None: ...

    @abstractmethod
    async def count(self, uid: str) -> int: ...


class VoiceInviteRepository(ABC):
    @abstractmethod
    async def find_by_token(self, token: str) -> VoiceInvite | None: ...

    @abstractmethod
    async def create(self, invite: VoiceInvite) -> VoiceInvite: ...

    @abstractmethod
    async def mark_used(self, token: str, voice_id: str) -> VoiceInvite | None: ...


class ConversionRepository(ABC):
    @abstractmethod
    async def find_by_id(self, uid: str, story_id: str, voice_id: str) -> Conversion | None: ...

    @abstractmethod
    async def find_all_for_story(self, uid: str, story_id: str) -> list[Conversion]: ...

    @abstractmethod
    async def create(self, uid: str, conversion: Conversion) -> Conversion: ...

    @abstractmethod
    async def update(self, uid: str, story_id: str, voice_id: str, data: dict) -> Conversion | None: ...


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
    pronunciation: PronunciationService
