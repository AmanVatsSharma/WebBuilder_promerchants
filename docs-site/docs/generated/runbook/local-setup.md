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
- Optional auth hardening:
  - `API_AUTH_KEY` (require `x-api-key` on all API requests)
  - `ENFORCE_SITE_SCOPE=true` (require `x-site-id` to match route `:siteId` for site-scoped endpoints)

You can copy baseline values from `.env.example`.

### Builder
- Uses `/api/*` rewrite -> `http://localhost:3000/api/*`
- Optional: `NEXT_PUBLIC_STOREFRONT_URL` for preview links

### Storefront
- Optional: `API_BASE_URL` (defaults to `http://localhost:3000/api`)

