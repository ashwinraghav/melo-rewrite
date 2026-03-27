# Mello — Claude Code Guide

## What is this?

Mello is a mobile-first web app for distributing calm, lo-fi audio stories to young children.
A parent signs in with Google, sets a child age + preferred topics, and plays stories in the browser.
There are no child sub-accounts. No downloads. No payments (yet).

## Monorepo layout

```
apps/api/         FastAPI (Python) REST API → Cloud Run
apps/web/         Next.js 14 App Router → Cloud Run
packages/types/   Shared TypeScript types (domain + API wire types)
docs/             Architecture, data models, API reference, ADRs
```

## Running locally

```bash
# Web (Next.js)
pnpm install
pnpm --filter @mello/web dev     # port 3000

# API (Python)
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn mello_api.asgi:app --reload --port 8080
```

Copy `.env.example` → `.env` in `apps/api/`.
Copy `.env.local.example` → `.env.local` in `apps/web/`.

## Running tests

```bash
# API tests (Python, no GCP needed)
cd apps/api && .venv/bin/pytest tests/ -v

# Web tests
pnpm --filter @mello/web test
```

## Key patterns

**Repository pattern (API):** All Firestore access goes through ABC interfaces in
`apps/api/mello_api/repositories/interfaces.py`. Never import Firestore directly in routes.
Add new queries by: (1) updating the interface, (2) implementing in `memory.py`, (3) implementing in `firestore.py`.

**Auth (API):** Firebase ID token verified in `apps/api/mello_api/middleware/auth.py`.
**EVERY new API route under `/v1/` MUST use `Depends(get_current_user)`** — no unauthenticated
endpoints except `/health`. The test bypass (`x-test-uid` header) is disabled in production
(`ENV=production`). Never add routes that skip auth without explicit approval.

**Design tokens:** All colors come from CSS variables in `apps/web/src/styles/globals.css`.
Never use raw hex values in Tailwind classes — use semantic tokens like `bg-surface`, `text-on-surface`.
Dark theme is the default (and primary) theme.

**Client state:** TanStack Query for server data. Firebase Auth state via `useAuthContext()`.
No Redux, no Zustand — keep it simple.

**Route handlers (API):** **NEVER use `async def` for route handlers that call blocking code**
(Firestore, external HTTP APIs, GCS, Cloud Tasks, etc.). Always use `def` (sync) — FastAPI runs
sync handlers in a threadpool, keeping the event loop free. Only use `async def` when ALL I/O in
the handler uses `await`. If you need multipart uploads, use `UploadFile = File(...)` instead of
`await request.form()`.

**Client initialization (API):** All external clients (GCS, Firestore, Cloud Tasks, Anthropic,
Cohere, Vertex AI, ElevenLabs) MUST be created once in `__init__` and reused — never recreated
per request or per method call. Use `requests.Session` (not bare `requests.post()`) for HTTP APIs
to get connection pooling. All Google Cloud, Anthropic, and Cohere clients are thread-safe.

**Background tasks (API):** Long-running operations (story generation, publishing, voice cloning,
story conversion) are offloaded via Cloud Tasks to `/internal/tasks/` endpoints on the same
Cloud Run service. User-facing endpoints return 202 immediately; frontends poll a status endpoint.
Task handlers in `routes/tasks.py` must be `def` (sync), not `async def`.

## Adding a new API endpoint

1. Add method to the relevant ABC in `mello_api/repositories/interfaces.py`
2. Implement in `mello_api/repositories/memory.py` (for tests)
3. Implement in `mello_api/repositories/firestore.py` (for production)
4. Add router in `mello_api/routes/`
5. Include router in `mello_api/main.py`
6. Write tests in `tests/`

## Design system

From the Stitch project "Editorial Serenity" (project ID 13037681786636023062).
**Dark theme** is default. Same hues from the Stitch light palette, adapted for dark backgrounds.

- Primary font: Plus Jakarta Sans (display/headings)
- Body font: Lexend (body text)
- **No borders** — use surface container tiers for separation ("No-Line" rule)
- **No pure black/white** — always use system tokens
- Minimum tap target: 4rem (64px)
- All transitions: 300ms ease-in-out
- Corner radius: minimum 0.5rem, standard 1rem
- Primary buttons: gradient from `primary` to `primary-dim`, rounded-full
- Selection chips: `secondary-container` bg, no borders
- Glassmorphic player/nav: `surface-bright` at 80% opacity, 12px backdrop-blur
- Ambient shadows: 32px blur, 6% opacity, tinted `on-surface`
- Ghost borders only: `outline-variant` at 15% opacity max

## Error monitoring (Sentry)

**Dashboard:** https://spectrum-bridge.sentry.io/issues/
**Org:** `spectrum-bridge` | **Project:** `javascript-nextjs`

- **Frontend** (`@sentry/nextjs`): client-side error capture, session replay, `global-error.tsx` boundary.
  Config in `apps/web/src/instrumentation-client.ts`.
- **Backend** (`sentry-sdk[fastapi]`): auto-captures unhandled route errors.
  Init in `apps/api/mello_api/asgi.py`.
- DSN is a public identifier, not a secret. No Sentry secrets in Secret Manager.
- Source map uploads use `SENTRY_AUTH_TOKEN` (build-time only, local `.env.local`).

## Infrastructure

**ALL infrastructure changes MUST go through Terraform.** No exceptions.

- Cloud Run (not GKE). One container per service. No Kubernetes.
- All infra is in `infra/terraform/`.
- **NEVER** use `gcloud run deploy`, `gcloud storage buckets create`, `gcloud iam`, or any imperative GCP CLI commands to create/modify infrastructure. Always use `terraform apply`.
- **NEVER** create GCP resources (buckets, service accounts, IAM bindings, Cloud Run services, etc.) outside of Terraform. If a resource is needed, add it to the `.tf` files first.
- The only exception is the one-time tfstate bucket creation (documented in `docs/deploy.md`).

**GCP project:** `melo-f5756` (project number `888632552624`)
**Region:** `us-central1`
**Artifact Registry:** `us-central1-docker.pkg.dev/melo-f5756/mello/`
**API URL:** `https://mello-api-rhp2tqs5qa-uc.a.run.app`
**Web URL:** `https://melo-f5756.web.app` / `https://melostories.com` / `https://melobooks.com`

## Deploying changes

When the user asks to deploy, use these scripts:

```bash
./scripts/deploy-web.sh        # Frontend only (test → build → firebase deploy)
./scripts/deploy-api.sh        # API only (test → docker build → push → terraform apply)
./scripts/deploy-all.sh        # Both
./scripts/test-all.sh          # Run all tests without deploying
```

Add `--skip-tests` to skip the test step when iterating fast.

**Workflow for a typical change:**
1. Make the code change
2. Run `./scripts/test-all.sh` to verify
3. Run the appropriate deploy script
4. The script handles build, push, and deploy automatically

**Web changes** are near-instant (static files to CDN).
**API changes** take ~60s (docker build + push + terraform apply + Cloud Run rollout).

See `docs/deploy.md` for full Terraform workflow and first-time bootstrap.
See `docs/adr/` for architectural decisions.
