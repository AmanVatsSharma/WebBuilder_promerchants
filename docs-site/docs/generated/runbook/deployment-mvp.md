---
sidebar_position: 24
---

# Runbook: MVP Deployment (API + Worker + Builder + Storefront)

## Goal

Deploy the editor-first MVP with:

- API (`apps/api`)
- Worker (`apps/api` worker entry)
- Builder (`apps/builder`)
- Storefront (`apps/storefront`)
- Postgres + Redis dependencies

## Prerequisites

- Docker + Docker Compose
- `.env` populated from `.env.example`
- If enabling ownership guard (`ENFORCE_SITE_OWNER=true`), set:
  - `NEXT_PUBLIC_ACTOR_ID` (builder)
  - `API_ACTOR_ID` (storefront server runtime)
- If enabling JWT auth context (`ENFORCE_AUTH_CONTEXT=true`), set:
  - `AUTH_JWT_SECRET` (+ optional issuer/audience checks)
  - `NEXT_PUBLIC_API_AUTH_TOKEN` (builder)
  - `API_AUTH_TOKEN` (storefront)

## 1) Build and start stack

```bash
docker compose up --build
```

Expected exposed ports:

- API: `3000`
- Builder: `4200`
- Storefront: `4201`
- Postgres: `5432`
- Redis: `6379`

## 2) Readiness checks

- API health:
  - `GET http://localhost:3000/api/health`
  - Expect `status=ok`
- Worker:
  - Verify worker container logs show startup message and no Redis/DB errors
- Builder:
  - Open `http://localhost:4200`
- Storefront:
  - Open `http://localhost:4201`

## 2.5) Database migrations (pre-traffic)

```bash
npm run db:migrate
npm run db:migrate:show
```

## 3) Seed and validate local MVP data

```bash
npm run mvp:seed
npm run mvp:validate
```

## 4) Smoke checks

1. Open builder dashboard and confirm site/page list loads.
2. Open themes page, seed/upload theme, build/install/publish.
3. Open publish center and verify rollback history visibility.
4. Open storefront published URL and preview URL.

## Known signals to watch

- Theme build jobs stuck in `QUEUED`:
  - worker not running or Redis misconfigured.
- 403 errors on site-scoped APIs:
  - verify `x-api-key` / `x-site-id` propagation and env (`API_AUTH_KEY`, `ENFORCE_SITE_SCOPE`).
- Storefront webpack warnings:
  - warnings about `theme-runtime` / `extension-runtime` dynamic require are expected due sandboxed runtime loading of user bundles.
