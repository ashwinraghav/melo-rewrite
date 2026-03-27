# ADR-007: Terms of Service and Privacy Policy

**Status:** Accepted
**Date:** 2026-03-27

## Context

Mello delivers AI-generated audio stories to young children. The content is consumed by children,
but the app is operated by parents. This creates a regulatory intersection between children's
privacy law (COPPA), AI content liability, and biometric data (voice cloning). We need a Terms of
Service, Privacy Policy, and a consent mechanism that correctly positions Mello as a parent-facing
service.

## Decision

### Legal positioning

Mello is a service **for adults (18+)**. Children are supervised listeners, not users. This is the
same model used by Netflix, Spotify Kids, and Headspace — the account holder is the parent, and
child-facing content is shared under parental supervision. This positioning is our primary COPPA
shield: since the service is not "directed to children," COPPA's strict data collection rules
apply only if we have "actual knowledge" of collecting child data (which we don't — all data is
provided by the parent).

### Documents created

| Document | Location | Purpose |
|---|---|---|
| Terms of Service (full) | `docs/terms-of-service.md` | Comprehensive legal document for lawyer review. Contains all clauses. |
| Privacy Policy (full) | `docs/privacy-policy.md` | Comprehensive privacy policy for lawyer review. |
| Terms of Service (hosted) | `/terms` route | Rendered version for users, covers same material in web-friendly format. |
| Privacy Policy (hosted) | `/privacy` route | Rendered version for users. |

The `docs/` versions are the canonical source-of-truth with `[EMAIL]`, `[DATE]`, and `[CITY, STATE]`
placeholders for a lawyer to fill in. The hosted `/terms` and `/privacy` pages render the same
content in the app's design system.

### Key provisions

1. **Age gate (ToS §1):** Account holders must be 18+. Children cannot create accounts.
2. **Parental responsibility (ToS §1.2):** Parent accepts full responsibility for supervising child's use and reviewing content.
3. **AI content disclaimer (ToS §3):** AI-generated content is probabilistic. No guarantee of appropriateness. Age ranges are guidance, not guarantees. Parent must not rely solely on Mello's filtering.
4. **Voice cloning / biometrics (ToS §4, Privacy §5):** Explicit consent required. Biometric data notice for IL/TX/WA. No recordings from children under 13.
5. **COPPA (Privacy §4):** Service not directed to children under 13. No child data collected directly. No persistent child identifiers.
6. **Liability (ToS §§7-8):** "As is" disclaimer. No liability for content consumed by children. $100 cap.
7. **Arbitration + class waiver (ToS §10):** Mandatory individual arbitration, AAA rules.
8. **Re-consent (ToS §11):** Material changes require affirmative re-consent via the TermsGate.

### Consent flow architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SIGN-IN PAGE                          │
│                                                          │
│  ┌─ Checkbox: "I am 18+ and agree to ToS + Privacy" ──┐ │
│  │  Links open /terms and /privacy in new tabs         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  [Continue with Google] ← disabled until checked         │
│                                                          │
│  On successful sign-in:                                  │
│    POST /v1/me/accept-terms { termsVersion: "1.0" }      │
│    → stores termsVersion + termsAcceptedAt on profile    │
│    → redirects to /discover                              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              (APP) LAYOUT — TERMS GATE                   │
│                                                          │
│  On every authenticated page load:                       │
│    1. Fetch GET /v1/me                                   │
│    2. Compare profile.termsVersion vs CURRENT_TERMS_VER  │
│    3. If match → render app normally                     │
│    4. If mismatch or null → show TermsGate component     │
│                                                          │
│  TermsGate:                                              │
│    - Shows "Updated Terms" message                       │
│    - Links to /terms and /privacy                        │
│    - Checkbox + Continue button                          │
│    - POST /v1/me/accept-terms on accept                  │
│    - Invalidates ['me'] query cache                      │
│    - Dismisses gate, renders app                         │
└──────────────────────────────────────────────────────────┘
```

### Data model changes

**UserProfile** (Firestore `users/{uid}`):
```
termsVersion:    string | null   // e.g. "1.0", null if never accepted
termsAcceptedAt: string | null   // ISO 8601 timestamp
```

**API endpoint:**
```
POST /v1/me/accept-terms
Body: { termsVersion: "1.0" }
Response: updated UserProfile

Validates that termsVersion matches CURRENT_TERMS_VERSION (server-side constant).
Returns 400 if version doesn't match.
```

**Version constant:**
- TypeScript: `CURRENT_TERMS_VERSION` exported from `@mello/types`
- Python: `CURRENT_TERMS_VERSION` in `mello_api/models/user.py`

### How to bump terms version

When the ToS or Privacy Policy is materially updated:

1. Update the hosted pages at `/terms` and `/privacy`
2. Update `CURRENT_TERMS_VERSION` in both:
   - `packages/types/src/user.ts`
   - `apps/api/mello_api/models/user.py`
3. Rebuild and deploy

All existing users will see the TermsGate on their next visit and must re-consent.
New users will see the updated checkbox text on the sign-in page.

### What was removed

The onboarding flow (`/onboarding` — child age + topic selection screens) was removed. After
sign-in, users go directly to `/discover`. The `childAge` and `preferredTopics` fields remain on
the user model for future use (e.g. in a settings/preferences page) but are no longer required
before accessing the app.

## Consequences

- **Lawyer review is required** before going live. The `docs/` versions have placeholders.
- The TermsGate adds one extra API call (GET /v1/me) in the app layout. This is already cached by
  React Query and shared with other components that need the profile.
- Bumping `CURRENT_TERMS_VERSION` is a deploy-time operation, not a runtime config change. This is
  intentional — terms changes should go through code review.
- The sign-in page is the only place new users accept terms. The TermsGate is only for returning
  users after a version bump.
