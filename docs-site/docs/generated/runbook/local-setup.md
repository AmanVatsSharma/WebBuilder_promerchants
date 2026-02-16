---
sidebar_position: 20
---

# Runbook: Local Setup

## Prerequisites
- Node v20+ (repo currently tested with Node v24)
- PostgreSQL
- Redis (required for durable theme build queue)

## Start commands

```bash
npx nx serve api
npx nx run api:worker
npx nx serve builder
npx nx serve storefront
```

## Quick health checks

- API readiness: `GET http://localhost:3000/api/health`
- Builder: `http://localhost:4200`
- Storefront: `http://localhost:4201`

## Containerized start (optional)

```bash
docker compose up --build
```

This starts Postgres, Redis, API, worker, builder, and storefront.

## Key env vars

### API
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `STORAGE_DIR` (defaults to `<repo>/storage`)
- Redis: `REDIS_URL` or `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB`
- Queue tuning: `THEME_BUILD_CONCURRENCY`, `THEME_BUILD_MAX_ATTEMPTS`
- Domain challenge orchestration:
  - `DOMAIN_CHALLENGE_SCHEDULER_ENABLED=true` to enable background retry polling
  - `DOMAIN_CHALLENGE_SCHEDULER_INTERVAL_MS` (default 30000)
  - `DOMAIN_CHALLENGE_RETRY_DELAY_MS` (default 30000)
  - `DOMAIN_CHALLENGE_MAX_ATTEMPTS` (default 5)
  - `DOMAIN_CHALLENGE_ALERT_WEBHOOK_URL` (optional alert sink for exhausted/failed challenges)
- Optional auth hardening:
  - `API_AUTH_KEY` (require `x-api-key` on all API requests)
  - `ENFORCE_AUTH_CONTEXT=true` + `AUTH_JWT_SECRET` (require bearer JWT with `sub` + `workspaceIds`)
  - Optional key rotation config:
    - `AUTH_JWT_ACTIVE_KID`
    - `AUTH_JWT_SECRETS_JSON` (JSON map of `{ "<kid>": "<secret>" }`)
  - Optional `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE` for extra JWT claim checks
  - Optional `AUTH_JWT_TTL_SECONDS` (token lifetime, default 3600)
  - `ENFORCE_SITE_SCOPE=true` (require `x-site-id` to match route `:siteId` for site-scoped endpoints)
  - `ENFORCE_SITE_OWNER=true` (enforce `x-actor-id` ownership checks for protected site/editor routes)
  - `AUTO_CLAIM_SITE_OWNER=true` (first actor touching ownerless site becomes owner; default true)

You can copy baseline values from `.env.example`.

### Builder
- Uses `/api/*` rewrite -> `http://localhost:3000/api/*`
- Optional: `NEXT_PUBLIC_STOREFRONT_URL` for preview links
- Optional: `NEXT_PUBLIC_ACTOR_ID` (forward actor context for ownership guard)
- Optional: `NEXT_PUBLIC_API_AUTH_TOKEN` (forward bearer token for auth-context guard)

### Storefront
- Optional: `API_BASE_URL` (defaults to `http://localhost:3000/api`)
- Optional: `API_ACTOR_ID` (forward actor context for guarded API modes)
- Optional: `API_AUTH_TOKEN` (forward bearer token for auth-context guard)

## Identity bootstrap (when auth context is enabled)

1. Register owner:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "content-type: application/json" \
  -d '{"email":"owner@example.com","password":"password123","workspaceName":"My Workspace"}'
```
2. Login and copy `token`:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"owner@example.com","password":"password123"}'
```
3. Refresh token rotation:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "content-type: application/json" \
  -d '{"refreshToken":"<refresh-token-from-login>"}'
```
4. Token interoperability endpoints:
```bash
curl http://localhost:3000/api/auth/jwks
curl -X POST http://localhost:3000/api/auth/introspect \
  -H "content-type: application/json" \
  -d '{"token":"<access-token>"}'
```

## Domain challenge SLO metrics

```bash
curl http://localhost:3000/api/domains/challenges/metrics
curl http://localhost:3000/api/domains/challenges/metrics/prometheus
curl "http://localhost:3000/api/domains/challenges/alerts?limit=20"
```

