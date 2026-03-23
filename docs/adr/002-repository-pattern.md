# ADR 002 — Repository pattern for data access

**Status:** Accepted

## Context

The API needs to read/write Firestore. Tests need to run without GCP.

## Decision

All database access goes through typed interfaces defined in
`apps/api/src/repositories/interfaces.ts`. There are two implementations:
- `memory/` — in-memory maps, used in tests
- `firestore/` — production implementation using Firebase Admin SDK

## Reasons

1. **Tests are fast and offline.** No emulator setup, no GCP credentials.
2. **Business logic is readable.** Route handlers read like pseudocode.
3. **Database is swappable.** If we move to Cloud Spanner or Postgres, only the `firestore/` directory changes.
4. **Explicit contracts.** The interface forces you to think about what the database needs to support before writing the query.

## Consequences

- Every new query requires an update to the interface AND both implementations.
- The in-memory implementations are simple (no indexing, no pagination) — if query complexity grows, they may diverge from Firestore semantics. Write integration tests against the Firestore emulator for complex queries.
