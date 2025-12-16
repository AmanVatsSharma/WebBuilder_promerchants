---
sidebar_position: 20
---

# Runbook: Local Setup

## Prerequisites
- Node v20+ (repo currently tested with Node v24)
- PostgreSQL

## Start commands

```bash
npx nx serve api
npx nx serve builder
npx nx serve storefront
```

## Key env vars

### API
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `STORAGE_DIR` (defaults to `<repo>/storage`)

### Builder
- Uses `/api/*` rewrite -> `http://localhost:3000/api/*`
- Optional: `NEXT_PUBLIC_STOREFRONT_URL` for preview links

### Storefront
- Optional: `API_BASE_URL` (defaults to `http://localhost:3000/api`)

