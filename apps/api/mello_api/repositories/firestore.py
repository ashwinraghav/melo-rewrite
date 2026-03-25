"""
Firestore + Cloud Storage repository implementations for production.
Signed URLs use ADC — the service account must have serviceAccountTokenCreator on itself.
"""
from __future__ import annotations
from datetime import timedelta, datetime, timezone
from typing import TYPE_CHECKING
import google.auth
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.cloud import storage as gcs
from google.oauth2.service_account import Credentials as SACredentials
from ..models.story import Story, StoryFilters, StorySegment, categorize_duration
from ..models.user import UserProfile
from ..models.listening import Favorite, HistoryEntry
from .interfaces import StoryRepository, UserRepository, FavoriteRepository, HistoryRepository, Repositories

if TYPE_CHECKING:
    import google.cloud.firestore


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _story_from_doc(doc_id: str, data: dict) -> Story:
    raw_segments = data.get("segments", [])
    segments = [
        StorySegment(text=s["text"], start_time=s["startTime"], end_time=s["endTime"])
        for s in raw_segments
    ]
    return Story(
        id=doc_id,
        title=data["title"],
        description=data["description"],
        duration_seconds=data["durationSeconds"],
        duration_category=categorize_duration(data["durationSeconds"]),
        age_min=data["ageMin"],
        age_max=data["ageMax"],
        topics=data.get("topics", []),
        audio_path=data["audioPath"],
        cover_art_path=data["coverArtPath"],
        story_text=data.get("storyText", ""),
        segments=segments,
        is_published=data.get("isPublished", False),
        created_at=data.get("createdAt", _now()),
        updated_at=data.get("updatedAt", _now()),
    )


class FirestoreStoryRepository(StoryRepository):
    def __init__(self, db: "google.cloud.firestore.Client", bucket_name: str, url_ttl_seconds: int) -> None:
        self._db = db
        self._bucket_name = bucket_name
        self._url_ttl_seconds = url_ttl_seconds
        # Reuse a single GCS client + credentials across all signed-URL calls
        # instead of creating new ones per call (avoids repeated metadata-server round-trips).
        self._gcs_client = gcs.Client()
        credentials, _ = google.auth.default()
        self._credentials = credentials
        self._sa_email: str | None = None
        if not isinstance(credentials, SACredentials):
            credentials.refresh(GoogleAuthRequest())
            self._sa_email = credentials.service_account_email

    def find_by_id(self, story_id: str) -> Story | None:
        doc = self._db.collection("stories").document(story_id).get()
        if not doc.exists:
            return None
        story = _story_from_doc(doc.id, doc.to_dict())
        return story if story.is_published else None

    def find_by_id_any(self, story_id: str) -> Story | None:
        doc = self._db.collection("stories").document(story_id).get()
        if not doc.exists:
            return None
        return _story_from_doc(doc.id, doc.to_dict())

    def create(self, story: Story) -> Story:
        doc_data = {
            "title": story.title,
            "description": story.description,
            "durationSeconds": story.duration_seconds,
            "durationCategory": story.duration_category,
            "ageMin": story.age_min,
            "ageMax": story.age_max,
            "topics": story.topics,
            "audioPath": story.audio_path,
            "coverArtPath": story.cover_art_path,
            "storyText": story.story_text,
            "segments": [
                {"text": s.text, "startTime": s.start_time, "endTime": s.end_time}
                for s in story.segments
            ],
            "isPublished": story.is_published,
            "createdAt": story.created_at,
            "updatedAt": story.updated_at,
        }
        self._db.collection("stories").document(story.id).set(doc_data)
        return story

    def update(self, story_id: str, data: dict) -> Story | None:
        field_map = {
            "duration_seconds": "durationSeconds",
            "duration_category": "durationCategory",
            "age_min": "ageMin",
            "age_max": "ageMax",
            "audio_path": "audioPath",
            "cover_art_path": "coverArtPath",
            "story_text": "storyText",
            "is_published": "isPublished",
        }
        firestore_data: dict = {}
        for k, v in data.items():
            if k == "segments":
                firestore_data["segments"] = [
                    {"text": s["text"], "startTime": s["startTime"], "endTime": s["endTime"]}
                    for s in v
                ]
            else:
                firestore_data[field_map.get(k, k)] = v
        firestore_data["updatedAt"] = _now()
        self._db.collection("stories").document(story_id).update(firestore_data)
        return self.find_by_id_any(story_id)

    def find_many(self, filters: StoryFilters) -> list[Story]:
        query = self._db.collection("stories").where("isPublished", "==", True)

        # Use Firestore array-contains for single-topic filtering (most common case).
        # Firestore only supports one array-contains per query, so multiple topics
        # still fall back to in-memory filtering.
        topics_handled = False
        if filters.topics and len(filters.topics) == 1:
            query = query.where("topics", "array_contains", filters.topics[0])
            topics_handled = True

        docs = query.stream()
        stories = [_story_from_doc(d.id, d.to_dict()) for d in docs]

        if filters.topics and not topics_handled:
            stories = [s for s in stories if any(t in s.topics for t in filters.topics)]
        if filters.child_age is not None:
            stories = [s for s in stories if s.age_min <= filters.child_age <= s.age_max]
        if filters.duration is not None:
            stories = [s for s in stories if categorize_duration(s.duration_seconds) == filters.duration]

        return stories

    def _signed_url(self, path: str) -> str:
        blob = self._gcs_client.bucket(self._bucket_name).blob(path)
        expiration = timedelta(seconds=self._url_ttl_seconds)

        if isinstance(self._credentials, SACredentials):
            # Local dev with service account JSON
            return blob.generate_signed_url(version="v4", expiration=expiration, method="GET")
        else:
            # Cloud Run — refresh token only when expired
            if not self._credentials.token or not self._credentials.valid:
                self._credentials.refresh(GoogleAuthRequest())
            return blob.generate_signed_url(
                version="v4",
                expiration=expiration,
                method="GET",
                service_account_email=self._sa_email,
                access_token=self._credentials.token,
            )

    def get_audio_signed_url(self, story_id: str, audio_path: str) -> str:
        return self._signed_url(audio_path)

    def get_cover_art_signed_url(self, story_id: str, cover_art_path: str) -> str:
        return self._signed_url(cover_art_path)


class FirestoreUserRepository(UserRepository):
    def __init__(self, db: "google.cloud.firestore.Client") -> None:
        self._db = db

    def _ref(self, uid: str):
        return self._db.collection("users").document(uid)

    def find_by_id(self, uid: str) -> UserProfile | None:
        doc = self._ref(uid).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return UserProfile(
            uid=uid,
            email=data.get("email", ""),
            display_name=data.get("displayName"),
            child_age=data.get("childAge"),
            preferred_topics=data.get("preferredTopics", []),
            is_creator=data.get("isCreator", False),
            created_at=data.get("createdAt", _now()),
            updated_at=data.get("updatedAt", _now()),
        )

    def create(self, profile: UserProfile) -> UserProfile:
        data = {
            "email": profile.email,
            "displayName": profile.display_name,
            "childAge": profile.child_age,
            "preferredTopics": profile.preferred_topics,
            "isCreator": profile.is_creator,
            "createdAt": profile.created_at,
            "updatedAt": profile.updated_at,
        }
        self._ref(profile.uid).set(data)
        return profile

    def update(self, uid: str, data: dict) -> UserProfile:
        # Map Python snake_case keys to Firestore camelCase
        field_map = {
            "child_age": "childAge",
            "preferred_topics": "preferredTopics",
            "display_name": "displayName",
        }
        firestore_data = {field_map.get(k, k): v for k, v in data.items()}
        firestore_data["updatedAt"] = _now()
        self._ref(uid).update(firestore_data)
        profile = self.find_by_id(uid)
        assert profile is not None
        return profile


class FirestoreFavoriteRepository(FavoriteRepository):
    def __init__(self, db: "google.cloud.firestore.Client") -> None:
        self._db = db

    def _ref(self, uid: str, story_id: str):
        return self._db.collection("users").document(uid).collection("favorites").document(story_id)

    def find_all(self, uid: str) -> list[Favorite]:
        docs = (
            self._db.collection("users").document(uid).collection("favorites")
            .order_by("createdAt", direction="DESCENDING")
            .stream()
        )
        return [
            Favorite(user_id=uid, story_id=d.id, created_at=d.to_dict().get("createdAt", _now()))
            for d in docs
        ]

    def add(self, uid: str, story_id: str) -> Favorite:
        ref = self._ref(uid, story_id)
        doc = ref.get()
        if doc.exists:
            data = doc.to_dict()
            return Favorite(user_id=uid, story_id=story_id, created_at=data.get("createdAt", _now()))
        created_at = _now()
        ref.set({"createdAt": created_at})
        return Favorite(user_id=uid, story_id=story_id, created_at=created_at)

    def remove(self, uid: str, story_id: str) -> None:
        self._ref(uid, story_id).delete()

    def exists(self, uid: str, story_id: str) -> bool:
        return self._ref(uid, story_id).get().exists


class FirestoreHistoryRepository(HistoryRepository):
    def __init__(self, db: "google.cloud.firestore.Client") -> None:
        self._db = db

    def _ref(self, uid: str, story_id: str):
        return self._db.collection("users").document(uid).collection("history").document(story_id)

    def find_all(self, uid: str) -> list[HistoryEntry]:
        docs = (
            self._db.collection("users").document(uid).collection("history")
            .order_by("lastPlayedAt", direction="DESCENDING")
            .stream()
        )
        return [
            HistoryEntry(
                user_id=uid,
                story_id=d.id,
                progress_seconds=d.to_dict().get("progressSeconds", 0),
                completed=d.to_dict().get("completed", False),
                last_played_at=d.to_dict().get("lastPlayedAt", _now()),
            )
            for d in docs
        ]

    def upsert(self, uid: str, story_id: str, progress_seconds: int, completed: bool) -> HistoryEntry:
        last_played_at = _now()
        self._ref(uid, story_id).set({
            "progressSeconds": progress_seconds,
            "completed": completed,
            "lastPlayedAt": last_played_at,
        })
        return HistoryEntry(
            user_id=uid,
            story_id=story_id,
            progress_seconds=progress_seconds,
            completed=completed,
            last_played_at=last_played_at,
        )


def create_firestore_repositories(project_id: str, bucket_name: str, url_ttl_seconds: int) -> Repositories:
    from google.cloud import firestore as gc_firestore

    db = gc_firestore.Client(project=project_id)
    return Repositories(
        stories=FirestoreStoryRepository(db, bucket_name, url_ttl_seconds),
        users=FirestoreUserRepository(db),
        favorites=FirestoreFavoriteRepository(db),
        history=FirestoreHistoryRepository(db),
    )
