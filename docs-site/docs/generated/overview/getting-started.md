---
sidebar_position: 1
---

# Getting Started (Local Dev)

## Prerequisites
- Node: v20+ (repo currently uses Node v24 locally)
- PostgreSQL running locally
- Redis running locally (required for theme build queue + worker)

## Environment variables (API)
The API uses these defaults if unset:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USERNAME=postgres`
- `DB_PASSWORD=postgres`
- `DB_NAME=webbuilder`

Optional:
- `STORAGE_DIR=<repo>/storage` (defaults to `<repo>/storage`)
- `API_AUTH_KEY=<key>` (enforces `x-api-key` header globally)
- `ENFORCE_SITE_SCOPE=true` (enforces `x-site-id` header for `/api/sites/:siteId/*`)

## Start services

```bash
npx nx serve api
npx nx run api:worker
npx nx serve builder
npx nx serve storefront
```

## Optional containerized startup

```bash
docker compose up --build
```

Environment reference is available at repo root in `.env.example`.

## Minimal “happy path” demo
1. Create a Site: `POST /api/sites`
2. Map a domain: `POST /api/domains` (host + siteId)
3. Seed the default theme: `POST /api/themes/seed/default`
4. Build that theme version: `POST /api/themes/versions/:themeVersionId/build`
5. Install draft: `POST /api/sites/:siteId/theme/install`
6. Publish: `POST /api/sites/:siteId/theme/publish`
7. Visit storefront by host (or preview): `/?previewThemeVersionId=...`


