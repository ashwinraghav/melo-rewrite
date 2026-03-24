# Mello — Architecture

## Overview

Mello is a mobile-first web application for distributing calm, lo-fi audio stories to young children. A parent signs in, configures a child age + preferred topics, and plays stories directly in the browser. There are no child accounts, no downloads, and no payments in v1.

---

## System Diagram

```
Browser (mobile-first web)
        │
        │  HTTPS (CDN)
        ▼
  ┌─────────────────┐        ┌──────────────────┐
  │    apps/web      │──API──►│   apps/api        │
  │  (Next.js)       │        │  (FastAPI/Python)  │
  │  Firebase Hosting│        │  Cloud Run         │
  └─────────────────┘        └────────┬──────────┘
        │                             │
  Firebase Auth                ┌──────┴──────────┐
  (client SDK)                 │                 │
                           Firestore       Cloud Storage
                           (metadata)      (audio + art)
```

---

## Services

### apps/web (Next.js 14, App Router)
- Mobile-first responsive UI with Editorial Serenity dark theme
- Static export (`output: 'export'`) — all pages are client-rendered
- Firebase Auth web SDK for authentication
- TanStack Query for server state
- Framer Motion for transitions (300ms ease-in-out per design spec)
- Deployed to **Firebase Hosting** (global CDN), not Cloud Run

### apps/api (FastAPI, Python)
- Single monolith — no microservices
- Verifies Firebase ID tokens on every request (`Depends(get_current_user)`)
- All Firestore / Cloud Storage access goes here; the browser never touches GCP directly
- Deployed to Cloud Run (scale-to-zero)
- Repository pattern: business logic never imports Firestore directly

### packages/types
- Shared TypeScript types for the web frontend
- Single source of truth for domain objects, API shapes, and constants

---

## Authentication Flow

1. User opens the app → root page checks auth state
2. Not signed in → redirect to `/sign-in`
3. User taps "Continue with Google" → Firebase Auth popup
4. Firebase returns an ID token (JWT) to the browser
5. Web app includes `Authorization: Bearer <id-token>` on every API call
6. API verifies the token using Firebase Admin SDK
7. `user.uid` is available to all route handlers

---

## Data Access Pattern

```
Route handler
    │
    ▼
Repository ABC interface  ←── injected at startup
    │
    ├── MemoryRepository (tests)
    └── FirestoreRepository (production)
```

**Why repositories?**
- Tests run without GCP credentials (fast, offline, CI-friendly)
- Swapping Firestore for another database is a one-file change per repository
- Business logic (validation, filtering) is readable without Firestore specifics

---

## Story Audio Delivery

Stories are stored as MP3 files in Cloud Storage. The API never streams audio bytes — instead:

1. Client fetches story details: `GET /v1/stories/:id`
2. API generates a short-lived signed URL (15 min TTL) for the audio file
3. Client passes the URL directly to the `<audio>` element
4. Cloud Storage serves the audio; the API is not in the critical path

---

## Deployment

- **Web frontend**: Static export on Firebase Hosting (global CDN). Deploy: `./scripts/deploy-web.sh`
- **API**: Python Docker container on Cloud Run. Deploy: `./scripts/deploy-api.sh`
- **Infrastructure**: All managed via Terraform in `infra/terraform/`
- No Kubernetes — Cloud Run handles scaling automatically
- Application Default Credentials (ADC) on Cloud Run — no service account keys

---

## Key Decisions

See `docs/adr/` for full decision records.

| Decision | Choice | Rationale |
|---|---|---|
| Mobile framework | Next.js (web, not native) | Stitch mocks are HTML/CSS; web is sufficient |
| API framework | FastAPI (Python) | Clean async, Pydantic validation, repository pattern |
| Database | Firestore | Already on GCP, serverless, no ops overhead |
| Auth | Firebase Auth | Free, handles Google OAuth, ID tokens work with GCP IAM |
| Frontend hosting | Firebase Hosting (CDN) | All pages are client-rendered; CDN is faster + cheaper than Cloud Run |
| Testing | pytest (API), Vitest (web) | 60 tests total, all run offline |
