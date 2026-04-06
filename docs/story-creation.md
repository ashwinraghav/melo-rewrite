# Story Creation — Design Document

## Overview

Story Creation lets approved users generate original bedtime stories from a
text prompt. The user describes a story, selects an age group, and the system
produces a complete narrative (via Claude), narrated audio (via ElevenLabs TTS),
AI-generated cover art (via Imagen), and a vector embedding for search — all
published to the main catalog alongside curated content.

Not every user can create stories. Access is controlled by a **Firebase custom
claim** (`creator: true`) embedded in the user's ID token. Both the API and the
frontend enforce this gate.

## Access Control

### Firebase Custom Claims

Creator access is stored as a Firebase Auth custom claim rather than a
Firestore field lookup. This means:

1. The `creator` flag is part of the cryptographically signed ID token
2. The API reads it during normal token verification — no extra database read
3. The client cannot forge or modify custom claims
4. Changes require re-authentication (or up to 1 hour for automatic token refresh)

The Firestore `users/{uid}.isCreator` field is kept in sync for frontend
display purposes (the profile endpoint returns it), but the **custom claim is
the authoritative source** for API enforcement.

### Granting / Revoking Access

Use the admin script to manage creator access:

```bash
# Grant
python scripts/set-creator.py --email parent@example.com --grant

# Revoke
python scripts/set-creator.py --uid abc123 --revoke
```

The script sets both the Firebase custom claim and the Firestore `isCreator`
field in a single operation. The user must re-authenticate for the token change
to take effect.

### API Enforcement

All `/v1/creator/*` endpoints use the `require_creator` FastAPI dependency:

```python
async def require_creator(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not user.is_creator:
        raise HTTPException(status_code=403, detail="Creator access required")
    return user
```

`get_current_user` extracts `creator` from the decoded ID token:

```python
decoded = await asyncio.to_thread(fb_auth.verify_id_token, token)
is_creator = bool(decoded.get("creator", False))
```

Non-creators receive `403 Creator access required` on all creator endpoints.
This is enforced regardless of the frontend — direct API calls are blocked too.

### Test Bypass

In non-production environments (`ENV != "production"`), the test bypass headers
simulate creator status:

| Header | Default | Purpose |
|--------|---------|---------|
| `X-Test-Uid` | (required) | Bypass Firebase token verification |
| `X-Test-Email` | `None` | Simulate email |
| `X-Test-Creator` | `"true"` | Simulate creator claim |

The test bypass is **completely disabled** when `ENV=production`. The
`_ALLOW_TEST_BYPASS` flag is set once at import time — there is no way to
enable it at runtime in production.

### Frontend Enforcement

Two layers prevent non-creators from reaching the creation UI:

1. **Bottom navigation** — the Create tab only appears when
   `profile.isCreator` is `true` (fetched via `GET /v1/me`, deduplicated by
   TanStack Query's `['me']` cache key)

2. **Create page** — if a non-creator navigates to `/create` directly (e.g.
   via URL), `CreateContent` checks the profile and renders a "Creator Access
   Required" fallback with a link back to Discover

## User Flow

```
Creator (logged in)
────────────────────
/create page
  1. Enters story description (prompt, max 2000 chars)
  2. Selects age group: Toddler (1–3 yrs) or Preschool (3–6 yrs)
  3. Taps "Generate Story"
     → UI transitions to generating state (spinner)
     → API returns 202, Cloud Task runs Claude generation
     → Frontend polls status every 2 seconds
  4. Generation completes → UI transitions to review state
  5. Edits title, description, story text, topics
  6. Taps "Publish Story"
     → UI transitions to publishing state (full-screen overlay with progress)
     → API returns 202, Cloud Task runs 4-step pipeline
     → Frontend polls status, shows animated phase indicator
  7. Publishing completes → success screen
  8. "Listen Now" → player page | "Create Another" → reset
```

### State Machine

```
prompt ──→ generating ──→ review ──→ publishing ──→ success
  ↑             │            │            │
  └─────────────┘            │            │
     (generation failed)     └────────────┘
                              (publish failed)
```

Failures reset to the appropriate prior state with an error banner. The user
can retry without losing their prompt or draft.

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-id-token>` with the
`creator` custom claim set to `true`. Non-creators receive `403`.

### POST /v1/creator/generate

Start story generation from a prompt. Returns `202` immediately.

**Request:**
```json
{
  "prompt": "A gentle story about a fox who learns to share...",
  "age": 4
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| prompt | string | 1–2000 characters |
| age | integer | 1–6 (1–3 = toddler tier, 4–6 = preschool tier) |

**Response (202):**
```json
{
  "data": {
    "id": "abc123def456",
    "generateStatus": "processing"
  }
}
```

The returned `id` is used to poll status and to publish.

### GET /v1/creator/stories/:id/status

Poll for generation and publishing progress.

**Response:**
```json
{
  "data": {
    "generateStatus": "ready",
    "generateError": "",
    "publishStatus": "idle",
    "publishStep": "",
    "publishError": "",
    "isPublished": false,
    "draft": {
      "id": "abc123def456",
      "title": "The Sharing Fox",
      "description": "A young fox discovers the joy of sharing...",
      "storyText": "Once upon a time, in a quiet meadow...",
      "topics": ["animals", "kindness", "sharing"],
      "ageMin": 3,
      "ageMax": 6,
      "createdAt": "2026-04-06T12:00:00Z"
    }
  }
}
```

The `draft` field is only included when `generateStatus` is `"ready"`. During
publishing, `publishStep` indicates progress: `queued` → `generating_audio` →
`creating_cover` → `generating_embedding` → `finalizing`.

### PATCH /v1/creator/stories/:id

Edit a draft story before publishing. Partial update.

**Request:**
```json
{
  "title": "The Generous Fox",
  "description": "Updated description",
  "storyText": "Updated story text...",
  "topics": ["animals", "kindness"]
}
```

All fields optional. Cannot edit published stories (returns `400`). Only the
story owner can edit (returns `403` for other users).

**Response:** `ApiResponse<GenerateStoryResponse>`

### POST /v1/creator/stories/:id/publish

Start the publishing pipeline. Returns `202` immediately.

**Response (202):**
```json
{
  "data": {
    "id": "abc123def456",
    "publishStatus": "processing"
  }
}
```

If a publish is already in progress and less than 5 minutes old, returns `409`.
If stale (>5 min), allows retry.

## Architecture

### Generation Pipeline

```
Browser               API (Cloud Run)           Cloud Tasks            Claude (Anthropic)
───────               ───────────────           ───────────            ──────────────────
POST /creator/generate
  ──────────────────→ Create placeholder story
                      (generate_status: processing)
                      Enqueue Cloud Task ──────→
  ←────── 202 { id }

  (polls /status)                               POST /internal/tasks/generate-story
                                                  ─────────────────────────────────→
                                                  Extended thinking + structured output
                                                  ←─────────────────────────────────
                                                  title, description, text, topics, themes
                                                Update story (generate_status: ready)
  ←────── status: ready + draft
```

Claude generates stories using extended thinking with research-backed prompts
tailored to the age tier. Output is structured JSON with title, description,
story text, topics, themes, and age range.

### Publishing Pipeline

```
Browser               API                       Cloud Tasks            External Services
───────               ───                       ───────────            ─────────────────
POST /creator/stories/:id/publish
  ──────────────────→ Set publish_status: processing
                      Enqueue Cloud Task ──────→
  ←────── 202

  (polls /status)                               POST /internal/tasks/publish-story

                                                Step 1: generating_audio
                                                  → ElevenLabs TTS → audio MP3 + timed segments
                                                  → Upload to Cloud Storage

                                                Step 2: creating_cover
                                                  → Imagen → cover art PNG + thumbnail
                                                  → Upload to Cloud Storage

                                                Step 3: generating_embedding
                                                  → Google GenAI → 768-dim vector embedding

                                                Step 4: finalizing
                                                  → Set is_published: true
                                                  → Invalidate search cache
                                                  → Publish updated catalog

  ←────── status: ready, isPublished: true
```

Each step updates `publishStep` in Firestore so the frontend can show
phase-specific progress. The frontend also runs a fallback timer that cycles
phases every 12 seconds in case polling gaps occur.

### Ownership Model

Every user-created story has `ownerUid` set to the creator's Firebase UID and
`source` set to `"user"` (vs `"curated"` for admin-created stories). Ownership
is checked on all draft operations — only the owner can edit, publish, or poll
status for their story.

## Data Model

### stories/{storyId} (creator-relevant fields)

| Field | Type | Notes |
|-------|------|-------|
| ownerUid | string | Creator's Firebase UID (empty for curated stories) |
| source | `"curated"` \| `"user"` | Distinguishes admin vs creator content |
| generateStatus | `"idle"` \| `"processing"` \| `"ready"` \| `"failed"` | Text generation progress |
| generateError | string | Error message if generation failed |
| publishStatus | `"idle"` \| `"processing"` \| `"ready"` \| `"failed"` | Publishing pipeline progress |
| publishStep | string | Current pipeline step (for UI progress) |
| publishError | string | Error message if publishing failed |

All other fields (title, description, audioPath, etc.) are the same as
documented in `docs/data-models.md`.

### users/{uid}

| Field | Type | Notes |
|-------|------|-------|
| isCreator | boolean | Synced from Firebase custom claim, used for UI display |

## Services

### StoryGeneratorService

```python
generate(prompt: str, age: int) -> GeneratedStory
```

- Production: `ClaudeStoryGenerator` — Claude Opus with extended thinking,
  age-tiered system prompts, structured JSON output
- Testing: `MockStoryGenerator` — returns canned data, no API calls

### AudioPublisherService

```python
publish(story_id, story_text, voice_id=None) -> AudioResult
```

Returns audio path, duration, and timed segments for read-along.

- Production: ElevenLabs TTS → Cloud Storage upload
- Testing: `MockAudioPublisher` — deterministic fake data

### CoverGeneratorService

```python
generate_and_upload(story_id, title, description, topics) -> str
```

Returns Cloud Storage path for the cover art.

- Production: Imagen → Cloud Storage upload (full + 96px thumbnail)
- Testing: `MockCoverGenerator` — returns fake path

### EmbeddingService

```python
embed_story(story) -> list[float]
```

Returns 768-dimensional vector for semantic search.

- Production: Google GenAI embedding model
- Testing: `MockEmbeddingService` — deterministic fake vector

## Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| CreateContent | `app/(app)/create/create-content.tsx` | Full create flow state machine |
| BottomNav | `components/bottom-nav.tsx` | Conditionally shows Create tab |

### Create Page State Machine

The `CreateContent` component manages the entire flow with React state:

- **prompt** — textarea + age selector + "Generate Story" button
- **generating** — spinner, polls `/status` every 2s
- **review** — editable title, description, text, topics + "Publish" / "Start Over"
- **publishing** — full-screen overlay with 4-phase progress animation
- **success** — celebration screen with "Listen Now" + "Create Another"

Uses TanStack Query for status polling (`refetchInterval: 2000`) and
`useMutation` for generate/publish/save operations. All errors surface in a
dismissible banner and reset to the appropriate state.

## Observability

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `mello.stories.generated` | Counter | Incremented on successful generation |
| `mello.stories.published` | Counter | Incremented on successful publish |
| `mello.story.generation.duration` | Histogram | End-to-end generation time |
| `mello.story.publish.duration` | Histogram | End-to-end publish pipeline time |

### Tracing

The publish pipeline creates named spans for each step:
`publish.generate_audio`, `publish.create_cover`, `publish.generate_embedding`,
`publish.finalize`. These are visible in Cloud Trace.

### Error Handling

- Generation failures: `generate_status` set to `"failed"`, error message
  stored in `generate_error`, frontend shows banner and resets to prompt state
- Publish failures: `publish_status` set to `"failed"`, error stored in
  `publish_error`, frontend shows banner and resets to review state
- Stale publishes (>5 min with no progress): allowed to retry

## Constraints

- **2000-character prompt limit** — keeps Claude generation time reasonable
- **Age range 1–6** — maps to two tiers: toddler (1–3) and preschool (3–6)
- **Async pipeline** — user-facing endpoints return 202 immediately; all heavy
  work runs via Cloud Tasks
- **Single owner** — stories are bound to the creator's UID; no collaborative
  editing
- **No draft persistence across sessions** — if the user leaves during review,
  the draft is lost (the story exists in Firestore but the frontend doesn't
  load existing drafts)
- **Creator access is binary** — no tiered quotas or rate limits in v1

## Testing

- 25 API tests in `tests/test_creator.py` covering auth enforcement, creator
  access gate (403 for non-creators), generation, draft editing, publishing,
  age validation, source field, segments, embeddings, and catalog visibility
- Mock implementations (`MockStoryGenerator`, `MockAudioPublisher`,
  `MockCoverGenerator`, `MockEmbeddingService`) enable testing without external
  API credentials
- `SyncTaskQueue` in tests dispatches Cloud Tasks synchronously via internal
  HTTP calls, so the full pipeline (generate → publish) runs in a single test
