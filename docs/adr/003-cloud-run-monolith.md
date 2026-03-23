# ADR 003 — Cloud Run monolith over GKE microservices

**Status:** Accepted

## Context

We need to deploy the API to GCP. Options: Cloud Run, GKE, App Engine.

## Decision

Deploy `apps/api` and `apps/web` as two separate Cloud Run services (one container each). No Kubernetes, no microservices within the API.

## Reasons

1. **Operational simplicity.** Cloud Run handles scaling, TLS, and traffic splitting with zero config.
2. **Cost.** Cloud Run scales to zero — no idle container costs.
3. **Speed.** We can have a working production deployment in under an hour.
4. **Migration path is clear.** If we ever need Kubernetes (custom networking, stateful workloads, many services), the same Docker images can run on GKE without code changes.

## Consequences

- No horizontal pod autoscaling customisation in v1 (Cloud Run's defaults are fine).
- Cold start latency (~1-2s) on the first request after scaling to zero. Acceptable for a low-traffic app at launch; Cloud Run min-instances can be set to 1 if it becomes an issue.
- Both services share the same GCP project and Firebase project.
