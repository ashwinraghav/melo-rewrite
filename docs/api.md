# Mello API Reference

Base URL: `https://api.mello.app` (production) / `http://localhost:8080` (local)

All endpoints except `GET /health` require `Authorization: Bearer <firebase-id-token>`.

---

## Response Envelope

**Success:**
```json
{ "data": <payload> }
```

**List:**
```json
{ "data": [...], "total": 3, "hasMore": false }
```

**Error:**
```json
{ "error": { "code": "NOT_FOUND", "message": "Story not found" } }
```

Error codes: `UNAUTHORIZED` | `FORBIDDEN` | `NOT_FOUND` | `VALIDATION_ERROR` | `INTERNAL_ERROR`

---

## Endpoints

### GET /health
Health check for Cloud Run. No auth required.

**Response:** `{ "status": "ok", "timestamp": "..." }`

---

### GET /v1/stories
List published stories.

**Query params (all optional):**
| Param | Type | Example |
|---|---|---|
| topics | comma-separated strings | `topics=animals,nature` |
| childAge | integer 1–12 | `childAge=5` |
| duration | `short` \| `medium` \| `long` | `duration=short` |

Multi-topic filtering requires a story to match **all** provided topics.

**Response:** `PaginatedResponse<StoryWithAudioUrl>`

---

### GET /v1/stories/:id
Get a single published story with resolved audio and cover art URLs.

**Response:** `ApiResponse<StoryWithAudioUrl>`
**Errors:** `404 NOT_FOUND`

---

### GET /v1/me
Get the current user's profile. Auto-creates the profile on first call.

**Response:** `ApiResponse<UserProfile>`

---

### PATCH /v1/me
Update the user's profile. Partial update — only included fields are changed.

**Body:**
```json
{
  "childAge": 5,
  "preferredTopics": ["animals", "space"],
  "displayName": "Alex"
}
```

All fields optional. `childAge` must be 1–12 or null.

**Response:** `ApiResponse<UserProfile>`
**Errors:** `400 VALIDATION_ERROR`

---

### GET /v1/me/favorites
List the current user's favorited stories, newest first.

**Response:** `PaginatedResponse<Favorite>`

---

### POST /v1/me/favorites/:storyId
Add a story to favorites. Idempotent.

**Response:** `201 ApiResponse<Favorite>`
**Errors:** `404 NOT_FOUND` (story doesn't exist or is unpublished)

---

### DELETE /v1/me/favorites/:storyId
Remove a story from favorites. No-op if not favorited.

**Response:** `204 No Content`

---

### GET /v1/me/history
List listening history, most recently played first.

**Response:** `PaginatedResponse<HistoryEntry>`

---

### POST /v1/me/history/:storyId
Record or update listening progress.

**Body:**
```json
{ "progressSeconds": 150, "completed": false }
```

Creates on first play, overwrites on subsequent plays. One entry per story.

**Response:** `201 ApiResponse<HistoryEntry>`
**Errors:** `400 VALIDATION_ERROR`, `404 NOT_FOUND`
