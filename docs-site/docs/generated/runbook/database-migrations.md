---
sidebar_position: 26
---

# Runbook: Database Migrations

## Purpose

Apply/revert API schema migrations in controlled environments.

## Commands

From workspace root:

```bash
npm run db:migrate
npm run db:migrate:show
npm run db:migrate:revert
```

These commands use `apps/api/src/typeorm-migration.datasource.ts`.

## Required env vars

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`

## Suggested deploy order

1. Deploy API container image.
2. Run `npm run db:migrate`.
3. Run health check `GET /api/health`.
4. Start worker/builder/storefront rollout.

## Rollback note

If an incompatible migration is deployed, run:

```bash
npm run db:migrate:revert
```

Then redeploy previous stable application image.
