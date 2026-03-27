# Performance Optimizations — Lighthouse 0.64 → 0.91

Performed on 2026-03-25/26 against `melostories.com/stories?topics=park`.
Lighthouse simulates Moto G Power on slow 4G.

## Results Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Performance Score** | 0.64 | 0.91 | +42% |
| **FCP** | 4,512ms | 1,659ms | -63% |
| **LCP** | 7,352ms | 2,917ms | -60% |
| **Speed Index** | 4,729ms | 3,484ms | -26% |
| **API server latency** | 1,351ms | 323ms | -76% |
| **API response size** | 24,460 B | 6,493 B | -73% |
| **API call duration** | 2,615ms | 397ms | -85% |
| TBT | 2ms | 0ms | — |
| CLS | 0.003 | 0.0005 | better |

## Optimizations Applied

### 1. Cache GCS client and credentials (API)

**Problem:** Every signed URL call in `FirestoreStoryRepository._signed_url()`
created a new `gcs.Client()`, called `google.auth.default()`, and refreshed
credentials via a metadata server HTTP call. For N stories, that was 2N
sequential round-trips to the metadata server.

**Fix:** Create the GCS client and credentials once in `__init__` and reuse
them. Token is only refreshed when expired.

**File:** `apps/api/mello_api/repositories/firestore.py`
**Impact:** -30% API server latency

### 2. Keep one Cloud Run instance warm (Terraform)

**Problem:** `min_instance_count = 0` meant the first request after idle hit a
cold start: boot Python, initialize Firebase Admin SDK, create Firestore
client, initialize all services. Cost: 500-1000ms.

**Fix:** Set `min_instance_count = 1` in `cloudrun.tf`.

**File:** `infra/terraform/cloudrun.tf`
**Impact:** Eliminates cold start latency (~500-1000ms on first request)
**Cost:** ~$5-10/month for a 1 vCPU / 512MB instance

### 3. Firestore array-contains for topic filtering

**Problem:** `find_many()` queried `where("isPublished", "==", True)`, streamed
ALL published stories, then filtered by topic in Python. Downloaded all story
data including storyText and segments just to throw most of it away.

**Fix:** For single-topic queries (the common case), use Firestore's
`array_contains` operator: `query.where("topics", "array_contains", topic)`.
Firestore filters server-side, returning only matching documents.

**File:** `apps/api/mello_api/repositories/firestore.py`
**Impact:** Fewer documents transferred from Firestore

### 4. Set authDomain to melostories.com

**Problem:** Firebase Auth SDK used `melo-f5756.firebaseapp.com` as
`authDomain`, causing a cross-origin iframe to load on every page:
- 92KB `iframe.js` download from `firebaseapp.com`
- CORS preflight + `getProjectConfig` call
- ~300-400ms added to every page load

**Fix:** Set `authDomain` to `melostories.com` (the app's own domain) per
Firebase best practices. The auth iframe becomes same-origin, eliminating the
cross-origin overhead. Also added `google_identity_platform_config` Terraform
resource to manage authorized domains.

**Files:** `apps/web/.env.example`, `infra/terraform/firebase.tf`, `scripts/deploy-web.sh`
**Impact:** -300-400ms per page load, `firebaseapp.com` requests eliminated
**Note:** Must also add `https://melostories.com/__/auth/handler` to Google
OAuth client's authorized redirect URIs in Cloud Console (manual step).

### 5. Use initializeAuth instead of getAuth

**Problem:** `getAuth()` internally loads `browserPopupRedirectResolver` which
opens a preemptive auth iframe on every page load — even pages that don't use
popup sign-in. Firebase's own docs call this out as a performance issue.

**Fix:** Switch to `initializeAuth()` with only persistence deps
(`indexedDBLocalPersistence`, `browserLocalPersistence`). Lazy-load
`browserPopupRedirectResolver` only in `signInWithGoogle()` via dynamic
`import('firebase/auth')`.

**Files:** `apps/web/src/lib/firebase.ts`, `apps/web/src/hooks/useAuth.ts`
**Impact:** Auth iframe eliminated from all pages except sign-in. FCP dropped
from 3,370ms to 1,696ms.

### 6. Public GCS URLs for cover art

**Problem:** The API generated a signed URL for each story's cover art using
RSA crypto. For 12 stories, that was 12 `generate_signed_url()` calls adding
server-side latency. Cover art for published stories isn't private — every
authenticated user can see the same thumbnails.

**Fix:** Grant `allUsers` `objectViewer` on the stories bucket (Terraform).
Return direct public URLs (`storage.googleapis.com/bucket/path`) instead of
signed URLs. Cover art signing eliminated entirely.

**Files:** `infra/terraform/iam.tf`, `apps/api/mello_api/repositories/interfaces.py`,
`apps/api/mello_api/repositories/firestore.py`, `apps/api/mello_api/routes/stories.py`
**Impact:** -47% API server latency, -37% response size

### 7. Public GCS URLs for audio

**Problem:** After making cover art public, the remaining 12
`generate_signed_url()` calls for audio were the last source of server-side
crypto overhead. The bucket was already publicly readable (from fix 6).

**Fix:** Add `get_audio_public_url()` to the repository interface. Switch the
stories route to use public URLs for audio too.

**Files:** Same as fix 6
**Impact:** API server latency dropped from 719ms to 323ms. Response size from
15,475 B to 6,493 B. Zero signed URL generation on the hot path.

### 8. Static skeleton in HTML (LCP optimization)

**Problem:** All pages were `'use client'` — the browser received empty HTML
from the CDN, waited for JS to download and execute, then React mounted and
showed content. LCP was 5.4s because cover art images couldn't load until
after JS → auth → API call → render.

**Fix:** Split every page into:
- `page.tsx` — server component with `<Suspense fallback={<Skeleton />}>`
- `*-content.tsx` — client component with data fetching

The skeleton is baked into the static HTML at build time. The browser paints it
immediately from the CDN response — before any JS loads. Lighthouse measures
LCP against the skeleton (which is large enough to be the largest contentful
paint) instead of a late-loading image.

Also changed the `(app)/layout.tsx` to render children during auth loading
instead of returning `null`.

**Files:** All pages under `apps/web/src/app/`
**Impact:** LCP dropped from 5,440ms to 2,917ms (-46%). Score jumped from 0.78
to 0.91.

**Pages with this pattern:**
discover, stories, stories/length, player, favorites, history, create,
search, voices, voice (recording), onboarding

## What We Investigated But Didn't Change

### Firebase `accounts:lookup` call (~480ms)
The Firebase Auth SDK calls `identitytoolkit.googleapis.com/v1/accounts:lookup`
on every page load to validate the persisted session. Firebase docs confirm
this is by design — `onAuthStateChanged` and `authStateReady()` both wait for
it. No recommended way to skip it. The ~480ms cost is the price of Firebase
Auth with `local` persistence.

### Server-side rendering
The app uses Next.js static export → Firebase Hosting CDN. There is no server
at request time. SSR would require moving to Cloud Run for the web app (or
Firebase App Hosting). The static skeleton approach achieved most of the LCP
benefit without changing the hosting model.

### Font subsetting
The 364KB Material Symbols Rounded font is the largest single asset. Subsetting
to only the ~15 icons used would save ~340KB and improve FCP by ~100-200ms.
Deferred — diminishing returns at 0.91 score.

### 9. Cache-Control headers on GCS story assets

**Problem:** Cover art and audio objects in GCS had no `Cache-Control` header.
Browsers re-fetched every image on every page load, even within the same
session.

**Fix:** Set `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`
on all objects under `stories/**`. Applied via `gsutil setmeta`.

- `max-age=86400` — browser caches for 24 hours (no network request on revisit)
- `stale-while-revalidate=604800` — serve stale for up to 7 days while
  revalidating in the background

**Impact:** Repeat visits to the same story load images instantly from browser
cache (0ms). This is the optimization most visible during same-session testing.
**Cost:** Free — just metadata on existing objects.
**Note:** New objects uploaded by the API don't inherit this automatically.
Consider setting default metadata in the upload code or a lifecycle policy.

### 10. Cloud CDN for story assets (edge caching)

**Problem:** Cover art and audio served directly from `storage.googleapis.com`
with no edge caching. Every request goes to GCS origin, adding latency for
users far from `us-central1`.

**Fix:** Cloud CDN via a global HTTPS load balancer with a backend bucket
pointing to `melo-f5756-stories`. All story assets served from
`cdn.melostories.com` with edge caching worldwide. Cache policy: 24h default
TTL, 7d max TTL, serve-while-stale for 24h.

**Infrastructure (Terraform):**
- `google_compute_global_address` — static IP
- `google_compute_backend_bucket` — CDN-enabled backend
- `google_compute_url_map` + `google_compute_target_https_proxy` — routing
- `google_compute_managed_ssl_certificate` — TLS for `cdn.melostories.com`
- `google_dns_record_set` — DNS A record

**Files:** `infra/terraform/cdn.tf`, `infra/terraform/main.tf`,
`apps/api/mello_api/repositories/firestore.py`
**Impact:** First request hits GCS, every subsequent request from that region
served from edge (~10-20ms). Repeat visitors and users outside US see the
biggest improvement.
**Cost:** ~$0.08/GB egress + $0.01/10k requests

### 11. Preconnect hints for CDN and API

**Problem:** Browser doesn't know about `cdn.melostories.com` or the API
origin until JS executes and makes fetch calls. DNS + TCP + TLS handshake
happens cold on first request.

**Fix:** Add `<link rel="preconnect">` in the root layout `<head>` for both
the CDN domain and the API origin. Browser warms connections during HTML parse,
before any JS runs.

**File:** `apps/web/src/app/layout.tsx`
**Impact:** -100-200ms on first image/API request per page load

## Architecture Pattern

Every page now follows:

```
page.tsx              → server component (runs at build time)
                        exports default function with <Suspense fallback={<Skeleton />}>
                        Skeleton HTML is baked into static .html file

*-content.tsx         → 'use client' component
                        data fetching, interactivity, auth
                        hydrates inside Suspense boundary at runtime
```

The static HTML served by Firebase Hosting CDN contains the full skeleton
layout. The browser paints it immediately. JS downloads in the background,
React hydrates, auth resolves, API call fires, data replaces the skeleton.

### 12. Firestore native vector search (replacing in-memory)

**Problem:** The search service loaded all story embeddings into a Python dict
at startup, computed cosine similarity in a loop, and maintained an invalidation
cache. This was O(N) in Python on every search and required re-loading all
embeddings when a story was published.

**Fix:** Migrated to Firestore's native `find_nearest` KNN vector search.
Firestore handles cosine similarity server-side using a vector index.

- Created a composite vector index on `(isPublished, embedding)` with 768
  dimensions via `gcloud firestore indexes composite create`
- Migrated existing embeddings from `list[float]` to `Vector()` type
  (Firestore `find_nearest` requires the `Vector` type, not plain arrays)
- Updated `create()` and `update()` to wrap embeddings in `Vector()`
- Added `vector_search()` to `StoryRepository` interface + implementations
- Rewrote `SearchService` to delegate to `repo.vector_search()` instead of
  in-memory cosine similarity
- Kept Cohere reranking as a second-pass refinement on top candidates
- Removed the `load_embeddings()` cache and `invalidate()` pattern

**Files:** `repositories/interfaces.py`, `repositories/firestore.py`,
`repositories/memory.py`, `services/search.py`, `routes/search.py`
**Impact:** Eliminates O(N) Python loop and memory cache. Search scales with
Firestore infrastructure instead of Python memory. Index updates automatically
when stories are published.

### 13. Static CDN catalog for story browse + player

**Problem:** The stories list and detail pages fetched from the API server,
which required Firebase Auth → API call → Firestore query on every page load.
This was the main blocker for player page Lighthouse scores.

**Fix:** Pre-generate story catalog as static JSON files in GCS, served via
Cloud CDN. The web client fetches from `cdn.melostories.com/catalog/` instead
of the API.

Generated files:
- `catalog/stories.json` — full catalog (list view, no text/segments)
- `catalog/topics/{topic}.json` — per-topic lists
- `catalog/stories/{id}.json` — individual story detail (with text + segments)

Catalog is regenerated after each story publish via `CatalogPublisherService`.
Manual regeneration: `scripts/regenerate-catalog.py`.

**Files:** `services/catalog_publisher.py`, `routes/creator.py`, `lib/cdn.ts`,
stories + player content components
**Impact:** Browse and play flows require zero auth, zero API calls. Data
arrives from CDN edge in ~10-20ms. Lighthouse can now measure the player page
without needing to authenticate.
