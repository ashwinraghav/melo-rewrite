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
In tests, pass `x-test-uid` header to bypass Firebase token verification.

**Design tokens:** All colors come from CSS variables in `apps/web/src/styles/globals.css`.
Never use raw hex values in Tailwind classes — use semantic tokens like `bg-surface`, `text-on-surface`.
Dark theme is the default (and primary) theme.

**Client state:** TanStack Query for server data. Firebase Auth state via `useAuthContext()`.
No Redux, no Zustand — keep it simple.

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

## Infrastructure

Cloud Run (not GKE). One container per service. No Kubernetes.
All infra is in `infra/terraform/`. Never deploy with `gcloud run deploy` — always use `terraform apply`.

**GCP project:** `melo-f5756` (project number `888632552624`)
**Region:** `us-central1`
**Artifact Registry:** `us-central1-docker.pkg.dev/melo-f5756/mello/`

See `docs/deploy.md` for full Terraform workflow and first-time bootstrap.
See `docs/adr/` for architectural decisions.
