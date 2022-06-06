---
sidebar_position: 23
---

# Deferred Platform Hardening (Post-Validation)

This checklist is intentionally deferred until local editor MVP validation is successful.

## Re-entry Criteria

- Editor local validation (`npm run mvp:seed && npm run mvp:validate`) passes repeatedly
- Core publish loop tested with real merchant-like pages
- Major UX blockers in editor/design/publish flows are closed

## Deferred Security + Multi-Tenant Hardening

- Add full authentication and workspace ownership boundaries
- Enforce tenant authorization on all site-scoped APIs
- Add API baseline protections (helmet, CORS allowlist, rate limits, payload limits)
- Tighten theme build/file path security constraints and add boundary tests
- Expand requestId correlation coverage across all async/background flows

## Deferred Release Readiness

- CI quality gates for lint/type/test/build docs-sync
- Dockerized API + builder + storefront runtime templates
- Environment templates for local/stage/prod
- Deployment workflows and rollback runbooks

## Implementation Trigger

When re-entry criteria are met, create a dedicated hardening plan and execute in a separate milestone branch.
