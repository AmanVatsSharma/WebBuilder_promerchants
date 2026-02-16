---
sidebar_position: 22
---

# Runbook: Editor Local Validation

## Goal

Validate the editor-first MVP loop locally with deterministic seed data and repeatable checks.

## Prerequisites

- API server running (`npx nx serve api`)
- Worker process running (`npx nx run api:worker`)
- Builder app running (`npx nx serve builder`)
- Storefront app running (`npx nx serve storefront`)
- Redis running (theme builds are queued and processed by worker)

## 1) Seed deterministic data

```bash
npm run mvp:seed
```

This script creates (or reuses):

- Site: `MVP Local Demo`
- Home page (`slug=home`)
- Default theme seed/build/install/publish
- Published pages
- Demo product

Seed output is stored at:

- `storage/local-validation/seed-output.json`

## 2) Validate API state

```bash
npm run mvp:validate
```

Validation checks:

- Site exists
- Seeded page exists
- Theme install + publish history exists
- Demo product exists
- Published page content is available

## 3) Manual UX pass

Using URLs from `seed-output.json`, verify:

1. Editor loads (`/editor/:pageId`)
2. Live preview updates immediately while editing
3. Save/build/install/publish flows complete from Builder UI
4. Publish Center shows audit history and rollback options
5. Storefront published + preview URLs render correctly

## Expected outcome

Local editor workflow should reliably support:

- create/edit content
- visual style controls
- live preview confidence
- publish with rollback visibility

## Common failure mode

If theme build jobs remain in `QUEUED` and never move to `RUNNING`, verify:

1. Redis is reachable by API + worker.
2. Worker process (`npx nx run api:worker`) is running.
3. `REDIS_*` (or `REDIS_URL`) env values are consistent across API and worker terminals.
