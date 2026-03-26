# Custom Voice Narration — Design Document

## Overview

Custom Voice Narration lets parents personalize bedtime stories by having them
narrated in a familiar voice — a grandparent, uncle, or their own. A family
member records a 30-second voice sample via a shareable link (no account
needed), and the parent can then convert individual stories to use that voice.

## User Flows

### 1. Creating a Voice via Invite

```
Parent (logged in)                          Family Member (no account)
──────────────────                          ──────────────────────────
Account menu → Voices
  → "Add a Voice"
  → Enters name + relationship
  → Gets shareable link
  → Sends link via text/email ────────────→ Opens link on any device
                                             No login required
                                             Sees reading passage
                                             Records 30+ seconds
                                             Previews & submits
                                           ←──── Voice appears as "Ready"
```

The invite link (`melostories.com/voice?token=xxx`) is the authorization. The
token is a UUID, single-use, and expires after 7 days. No Firebase Auth is
involved on the recording page — the page makes plain `fetch()` calls against
public API endpoints.

### 2. Converting a Story

```
Player page → "Personalize voice" button
  → Bottom sheet opens
  → Shows "Original Narrator" + custom voices
  → Tap "Convert" on a voice
  → Conversion runs server-side (ElevenLabs TTS)
  → Status flips to "Ready" when done
  → Tap to switch narrator instantly
```

Conversion is per-story, per-voice. The parent chooses which stories to
personalize — it's not automatic. Switching between voices swaps the audio URL
and read-along segment timings.

### 3. Playing with a Custom Voice

The player shows a "Personalize voice" button below the story title. When
tapped, a bottom sheet shows all voices with their conversion status for this
story. Tapping a ready voice:
- Swaps the audio URL to the converted version
- Updates the read-along segment timings
- No page reload — the AudioPlayer handles source changes seamlessly

Voice selection resets on track change (next/previous story).

## Data Model

### Firestore

```
voiceInvites/{token}
  ownerUid        string      Parent's Firebase UID
  voiceName       string      "Grandma Pat"
  relationship    string      "Grandma"
  status          string      "pending" | "used" | "expired"
  voiceId         string?     Set when invite is redeemed
  createdAt       string      ISO 8601
  expiresAt       string      ISO 8601 (7 days from creation)

users/{uid}/voices/{voiceId}
  name                string      "Grandma Pat"
  relationship        string      "Grandma"
  elevenLabsVoiceId   string      ElevenLabs voice_id for TTS
  status              string      "processing" | "ready" | "failed"
  sampleAudioPath     string      Firebase Storage path
  createdAt           string      ISO 8601

users/{uid}/conversions/{storyId}_{voiceId}
  storyId             string
  voiceId             string
  status              string      "pending" | "processing" | "ready" | "failed"
  audioPath           string      Firebase Storage path
  durationSeconds     int
  segments            array       [{text, startTime, endTime}, ...]
  createdAt           string      ISO 8601
  updatedAt           string      ISO 8601
```

### Firebase Storage

Voice data is private, stored in `melo-f5756.firebasestorage.app` (not the
public stories bucket). Security Rules restrict reads to the owning user:

```
voices/{uid}/{voiceId}/sample.webm              Original recording
voices/{uid}/{voiceId}/conversions/{storyId}.mp3 Converted story audio
```

Rules: `allow read: if request.auth.uid == uid; allow write: false;`
All writes go through the API (Firebase Admin SDK bypasses rules).

## API Endpoints

### Authenticated (require Firebase ID token)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/voices` | List user's voices (max 3) |
| POST | `/v1/voices/invite` | Create invite link |
| DELETE | `/v1/voices/{voiceId}` | Delete voice + ElevenLabs cleanup |
| POST | `/v1/voices/convert` | Start story conversion |
| GET | `/v1/voices/conversions/{storyId}` | List conversions for a story |

### Public (token-validated, no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/voices/invite/{token}` | Get invite metadata |
| POST | `/v1/voices/invite/{token}/record` | Upload recording, clone voice |

These are the only public `/v1/` endpoints. The invite token serves as
authorization (UUID, single-use, 7-day expiry).

## Architecture

### Voice Recording Flow

```
Browser (public page)           API                     ElevenLabs      Firebase Storage
─────────────────────           ───                     ──────────      ────────────────
GET /invite/{token}  ──────→  validate token
                     ←──────  invite metadata

MediaRecorder capture
POST /invite/{token}/record ─→ validate token
                               validate audio size
                               ──────────────────────────────────────→ upload sample.webm
                               ──────────────────────→ POST /v1/voices/add
                               ←──────────────────────  voice_id
                               create Voice doc (status: ready)
                               mark invite as used
                     ←──────── { voiceId, status: ready }
```

Key: Voice doc is only written to Firestore if BOTH the storage upload and
ElevenLabs clone succeed. If either fails, nothing is persisted and the invite
stays pending for retry.

### Story Conversion Flow

```
Browser (player)                API                     ElevenLabs      Firebase Storage
────────────────                ───                     ──────────      ────────────────
POST /v1/voices/convert ──────→ validate voice + story
                                create Conversion (processing)
                                ──────────────────────→ POST /text-to-speech/{voice_id}
                                ←──────────────────────  audio + timestamps
                                convert char timestamps → sentence segments
                                ──────────────────────────────────────→ upload audio.mp3
                                update Conversion (ready)
                       ←──────── Conversion object
```

### Playback with Custom Voice

```
Player loads story ──→ original audioUrl + segments
User opens Personalize sheet
  GET /v1/voices ──→ user's voice list
  GET /v1/voices/conversions/{storyId} ──→ conversion list with audioUrls
User taps a ready voice
  → React state: overrideAudioUrl + overrideSegments
  → AudioPlayer swaps src
  → ReadAlong uses new segment timings
```

## Services

### VoiceClonerService

```python
clone_voice(name, audio_bytes) → CloneResult(eleven_labs_voice_id)
delete_voice(eleven_labs_voice_id) → None
upload_sample(uid, voice_id, audio_bytes) → path
get_download_url(path) → url
```

Production: ElevenLabs API + Firebase Storage
Testing: MockVoiceCloner (deterministic, no external calls)

### AudioPublisherService (extended)

```python
publish(story_id, story_text, voice_id=None, audio_path_override=None, bucket_override=None)
```

The existing TTS service was extended with optional parameters so voice
conversion reuses the same pipeline. `voice_id` overrides the default narrator.
`bucket_override` writes to Firebase Storage instead of the public GCS bucket.

## Web Components

| Component | Location | Purpose |
|-----------|----------|---------|
| VoiceRecorder | `components/voice-recorder.tsx` | MediaRecorder wrapper, 30s min, preview |
| PersonalizeSheet | `components/personalize-sheet.tsx` | Bottom sheet for voice switching + conversion |
| RecordContent | `app/voice/record-content.tsx` | Public recording page (no auth) |
| VoicesContent | `app/(app)/voices/voices-content.tsx` | Voice management + invite creation |

### Recording Page (`/voice?token=xxx`)

- Lives outside `(app)/` layout — no auth guard, no bottom nav
- Does not load Firebase Auth SDK (90KB bundle vs 216KB for authenticated pages)
- Uses plain `fetch()` with no Bearer token
- State machine: loading → ready → recording → uploading → success/error

### Player Integration

A single "Personalize voice" button opens the PersonalizeSheet. The player
itself stays clean — no voice chips or clutter. Voice state (activeVoiceId,
overrideAudioUrl, overrideSegments) resets on track change.

## Constraints

- **Max 3 voices per account** — cost control for ElevenLabs cloning
- **30-second minimum recording** — ElevenLabs needs sufficient audio for quality cloning
- **7-day invite expiry** — security measure for shareable tokens
- **Single-use invites** — prevents duplicate cloning from the same link
- **Synchronous conversion** — the API call blocks until ElevenLabs TTS completes (~30-60s for a typical story). No background workers.
- **No auto-conversion** — user explicitly chooses which stories to personalize

## Infrastructure

- **No new secrets** — uses existing `ELEVENLABS_API_KEY` in Secret Manager
- **No new buckets** — uses Firebase Storage default bucket (already exists)
- **Terraform managed** — Firebase Storage API enablement + IAM binding for API service account
- **Firebase Storage Rules** — deployed via `firebase deploy --only storage`

## Testing

- **103 API tests** (22 voice-specific) covering auth enforcement, invite flow, recording validation, voice limits, conversion, and listing
- **73 web tests** covering components and pages
- Mock implementations (`MockVoiceCloner`, `MockAudioPublisher`) enable testing without ElevenLabs or GCP credentials

## Future Considerations

- **Background conversion** — move to Cloud Tasks for stories >500 words to avoid request timeouts
- **Polling/webhooks** — notify user when async conversion completes
- **CDN for voice audio** — Cloud CDN in front of Firebase Storage for cached playback
- **Voice preview** — play back the original sample from the Voices page
- **Conversion retry** — UI for retrying failed conversions
- **Persistent voice preference** — remember which voice was last used per story
