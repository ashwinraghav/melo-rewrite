# Mello — Data Models

All types are defined in `packages/types/src/`. This document explains the
*why* behind the model shapes, not just the *what*.

---

## Firestore Collections

```
stories/{storyId}
users/{uid}
users/{uid}/favorites/{storyId}
users/{uid}/history/{storyId}
```

### stories/{storyId}

Stories are written by the admin dashboard (out of scope for v1). The API reads them.

| Field | Type | Notes |
|---|---|---|
| id | string | Firestore document ID |
| title | string | Display name |
| description | string | One-sentence summary |
| durationSeconds | number | Raw audio length |
| durationCategory | short / medium / long | Derived field, stored for convenience |
| ageMin | number | 1–12 inclusive |
| ageMax | number | 1–12 inclusive |
| topics | string[] | Lowercase tags, e.g. "animals" |
| audioPath | string | Cloud Storage object path (NOT a URL) |
| coverArtPath | string | Cloud Storage object path |
| isPublished | boolean | Only published stories are surfaced |
| createdAt | string | ISO 8601 |
| updatedAt | string | ISO 8601 |

**Why store audioPath instead of a URL?**
Signed URLs expire. If we stored them, they'd go stale. The API generates
fresh signed URLs on demand. This also means we can rotate the bucket or
change CDN config without touching any stored data.

**Why store durationCategory if it's derived?**
Firestore can't compute derived fields at query time. Storing it lets us
filter by duration bucket in a single query field without post-processing.

---

### users/{uid}

One document per Firebase Auth user. Created on first sign-in.

| Field | Type | Notes |
|---|---|---|
| uid | string | Firebase Auth UID (= document ID) |
| email | string | From Firebase Auth token |
| displayName | string \| null | Optional |
| childAge | number \| null | 1–12; null until onboarding is complete |
| preferredTopics | string[] | Empty = no filter (show all) |
| createdAt | string | ISO 8601 |
| updatedAt | string | ISO 8601 |

**Why no child sub-profiles?**
V1 is a single-parent, single-child model. Adding multi-profile support
would make `childAge` and `preferredTopics` a subcollection — this is a
known future migration path, tracked but not implemented yet.

---

### users/{uid}/favorites/{storyId}

Subcollection. Document ID = storyId (intentional — prevents duplicates at
the data layer and makes exists-check O(1)).

| Field | Type | Notes |
|---|---|---|
| storyId | string | Redundant with document ID, stored for query convenience |
| addedAt | string | ISO 8601 |

---

### users/{uid}/history/{storyId}

Subcollection. One document per story per user — replaying a story
overwrites rather than appends. This keeps the collection small and makes
"resume where you left off" a single document read.

| Field | Type | Notes |
|---|---|---|
| storyId | string | = document ID |
| progressSeconds | number | Last known position |
| completed | boolean | True when ≥ 90% of story was played |
| listenedAt | string | Timestamp of most recent play |

**Why 90% for completion?**
Defined as `COMPLETION_THRESHOLD = 0.9` in `packages/types/src/listening.ts`.
Children often fall asleep near the end — 90% is a reasonable "they heard
the story" threshold. Change the constant to adjust globally.

---

## Duration Buckets

| Label | Seconds |
|---|---|
| short | 0 – 299 (< 5 min) |
| medium | 300 – 899 (5–15 min) |
| long | 900+ (> 15 min) |

Thresholds defined in `DURATION_THRESHOLDS` in `packages/types/src/story.ts`.
