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
from ..models.voice import Voice, VoiceInvite, Conversion
from .interfaces import (
    StoryRepository, UserRepository, FavoriteRepository, HistoryRepository,
    VoiceRepository, VoiceInviteRepository, ConversionRepository, Repositories,
)


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

    def find_by_id_any(self, story_id: str) -> Story | None:
        return self._stories.get(story_id)

    def create(self, story: Story) -> Story:
        self._stories[story.id] = story
        return story

    def update(self, story_id: str, data: dict) -> Story | None:
        story = self._stories.get(story_id)
        if story is None:
            return None
        updated = story.model_copy(update=data)
        updated = updated.model_copy(update={"updated_at": _now()})
        self._stories[story_id] = updated
        return updated

    def find_many(self, filters: StoryFilters) -> list[Story]:
        results = [s for s in self._stories.values() if s.is_published]

        if filters.topics:
            results = [s for s in results if any(t in s.topics for t in filters.topics)]

        if filters.child_age is not None:
            results = [s for s in results if s.age_min <= filters.child_age <= s.age_max]

        if filters.duration is not None:
            results = [s for s in results if categorize_duration(s.duration_seconds) == filters.duration]

        return results

    def vector_search(self, query_embedding: list[float], limit: int = 20) -> list[tuple[Story, float]]:
        """In-memory cosine similarity for tests."""
        import math

        def cosine_sim(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            mag_a = math.sqrt(sum(x * x for x in a))
            mag_b = math.sqrt(sum(x * x for x in b))
            if mag_a == 0 or mag_b == 0:
                return 0.0
            return dot / (mag_a * mag_b)

        published = [s for s in self._stories.values() if s.is_published and s.embedding]
        scored = [(s, cosine_sim(query_embedding, s.embedding)) for s in published]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]

    def get_audio_signed_url(self, story_id: str, audio_path: str) -> str:
        return f"https://storage.example.com/{audio_path}?signed=1"

    def get_cover_art_signed_url(self, story_id: str, cover_art_path: str) -> str:
        return f"https://storage.example.com/{cover_art_path}?signed=1"

    def get_cover_art_public_url(self, cover_art_path: str) -> str:
        return f"https://storage.googleapis.com/test-bucket/{cover_art_path}"

    def get_audio_public_url(self, audio_path: str) -> str:
        return f"https://storage.googleapis.com/test-bucket/{audio_path}"


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


class MemoryVoiceRepository(VoiceRepository):
    def __init__(self) -> None:
        self._voices: dict[str, dict[str, Voice]] = {}  # uid → {voiceId → Voice}

    def find_by_id(self, uid: str, voice_id: str) -> Voice | None:
        return self._voices.get(uid, {}).get(voice_id)

    def find_all(self, uid: str) -> list[Voice]:
        return list(self._voices.get(uid, {}).values())

    def create(self, uid: str, voice: Voice) -> Voice:
        if uid not in self._voices:
            self._voices[uid] = {}
        self._voices[uid][voice.id] = voice
        return voice

    def update(self, uid: str, voice_id: str, data: dict) -> Voice | None:
        voice = self._voices.get(uid, {}).get(voice_id)
        if voice is None:
            return None
        updated = voice.model_copy(update=data)
        self._voices[uid][voice_id] = updated
        return updated

    def delete(self, uid: str, voice_id: str) -> None:
        self._voices.get(uid, {}).pop(voice_id, None)

    def count(self, uid: str) -> int:
        return len(self._voices.get(uid, {}))


class MemoryVoiceInviteRepository(VoiceInviteRepository):
    def __init__(self) -> None:
        self._invites: dict[str, VoiceInvite] = {}  # token → VoiceInvite

    def find_by_token(self, token: str) -> VoiceInvite | None:
        return self._invites.get(token)

    def create(self, invite: VoiceInvite) -> VoiceInvite:
        self._invites[invite.token] = invite
        return invite

    def mark_used(self, token: str, voice_id: str) -> VoiceInvite | None:
        invite = self._invites.get(token)
        if invite is None:
            return None
        updated = invite.model_copy(update={"status": "used", "voice_id": voice_id})
        self._invites[token] = updated
        return updated


class MemoryConversionRepository(ConversionRepository):
    def __init__(self) -> None:
        # uid → {compound_key → Conversion}
        self._conversions: dict[str, dict[str, Conversion]] = {}

    @staticmethod
    def _key(story_id: str, voice_id: str) -> str:
        return f"{story_id}_{voice_id}"

    def find_by_id(self, uid: str, story_id: str, voice_id: str) -> Conversion | None:
        return self._conversions.get(uid, {}).get(self._key(story_id, voice_id))

    def find_all_for_story(self, uid: str, story_id: str) -> list[Conversion]:
        return [
            c for c in self._conversions.get(uid, {}).values()
            if c.story_id == story_id
        ]

    def create(self, uid: str, conversion: Conversion) -> Conversion:
        if uid not in self._conversions:
            self._conversions[uid] = {}
        key = self._key(conversion.story_id, conversion.voice_id)
        self._conversions[uid][key] = conversion
        return conversion

    def update(self, uid: str, story_id: str, voice_id: str, data: dict) -> Conversion | None:
        key = self._key(story_id, voice_id)
        conversion = self._conversions.get(uid, {}).get(key)
        if conversion is None:
            return None
        updated = conversion.model_copy(update={**data, "updated_at": _now()})
        self._conversions[uid][key] = updated
        return updated


def create_memory_repositories() -> Repositories:
    return Repositories(
        stories=MemoryStoryRepository(),
        users=MemoryUserRepository(),
        favorites=MemoryFavoriteRepository(),
        history=MemoryHistoryRepository(),
        voices=MemoryVoiceRepository(),
        voice_invites=MemoryVoiceInviteRepository(),
        conversions=MemoryConversionRepository(),
    )
