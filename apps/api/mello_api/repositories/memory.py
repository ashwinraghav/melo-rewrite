"""
In-memory repository implementations for testing.
All data lives in plain Python dicts — no GCP credentials needed.
"""
from __future__ import annotations
from datetime import datetime, timezone
from copy import deepcopy
from ..models.story import Story, StoryFilters, categorize_duration
from ..models.user import UserProfile
from ..models.listening import Favorite, HistoryEntry
from .interfaces import StoryRepository, UserRepository, FavoriteRepository, HistoryRepository, Repositories


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryStoryRepository(StoryRepository):
    def __init__(self) -> None:
        self._stories: dict[str, Story] = {}

    def seed(self, stories: list[Story]) -> None:
        self._stories = {s.id: s for s in stories}

    def find_by_id(self, story_id: str) -> Story | None:
        story = self._stories.get(story_id)
        if story is None or not story.is_published:
            return None
        return story

    def find_many(self, filters: StoryFilters) -> list[Story]:
        results = [s for s in self._stories.values() if s.is_published]

        if filters.topics:
            results = [s for s in results if any(t in s.topics for t in filters.topics)]

        if filters.child_age is not None:
            results = [s for s in results if s.age_min <= filters.child_age <= s.age_max]

        if filters.duration is not None:
            results = [s for s in results if categorize_duration(s.duration_seconds) == filters.duration]

        return results

    def get_audio_signed_url(self, story_id: str, audio_path: str) -> str:
        return f"https://storage.example.com/{audio_path}?signed=1"

    def get_cover_art_signed_url(self, story_id: str, cover_art_path: str) -> str:
        return f"https://storage.example.com/{cover_art_path}?signed=1"


class MemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        self._users: dict[str, UserProfile] = {}

    def find_by_id(self, uid: str) -> UserProfile | None:
        return deepcopy(self._users.get(uid))

    def create(self, profile: UserProfile) -> UserProfile:
        self._users[profile.uid] = deepcopy(profile)
        return deepcopy(profile)

    def update(self, uid: str, data: dict) -> UserProfile:
        profile = self._users.get(uid)
        if profile is None:
            raise ValueError(f"User {uid} not found")
        # Merge only the keys present in data
        updated = profile.model_copy(update={k: v for k, v in data.items()})
        updated = updated.model_copy(update={"updated_at": _now()})
        self._users[uid] = updated
        return deepcopy(updated)


class MemoryFavoriteRepository(FavoriteRepository):
    def __init__(self) -> None:
        self._favorites: dict[str, dict[str, Favorite]] = {}  # uid → {storyId → Favorite}

    def find_all(self, uid: str) -> list[Favorite]:
        return sorted(
            self._favorites.get(uid, {}).values(),
            key=lambda f: f.created_at,
            reverse=True,
        )

    def add(self, uid: str, story_id: str) -> Favorite:
        if uid not in self._favorites:
            self._favorites[uid] = {}
        if story_id not in self._favorites[uid]:
            self._favorites[uid][story_id] = Favorite(
                user_id=uid, story_id=story_id, created_at=_now()
            )
        return self._favorites[uid][story_id]

    def remove(self, uid: str, story_id: str) -> None:
        self._favorites.get(uid, {}).pop(story_id, None)

    def exists(self, uid: str, story_id: str) -> bool:
        return story_id in self._favorites.get(uid, {})


class MemoryHistoryRepository(HistoryRepository):
    def __init__(self) -> None:
        self._history: dict[str, dict[str, HistoryEntry]] = {}  # uid → {storyId → Entry}

    def find_all(self, uid: str) -> list[HistoryEntry]:
        return sorted(
            self._history.get(uid, {}).values(),
            key=lambda e: e.last_played_at,
            reverse=True,
        )

    def upsert(self, uid: str, story_id: str, progress_seconds: int, completed: bool) -> HistoryEntry:
        if uid not in self._history:
            self._history[uid] = {}
        entry = HistoryEntry(
            user_id=uid,
            story_id=story_id,
            progress_seconds=progress_seconds,
            completed=completed,
            last_played_at=_now(),
        )
        self._history[uid][story_id] = entry
        return entry


def create_memory_repositories() -> Repositories:
    return Repositories(
        stories=MemoryStoryRepository(),
        users=MemoryUserRepository(),
        favorites=MemoryFavoriteRepository(),
        history=MemoryHistoryRepository(),
    )
