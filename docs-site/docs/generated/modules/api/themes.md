# Themes Module

## Purpose
Provides **Theme Store** and **theme file management** for the builder/storefront platform.

This module supports:
- Uploading a **theme bundle** (zip)
- Extracting and tracking **theme files**
- Reading/updating files (for web editor)
- Installing a theme version for a **Site** (draft selection)
- Building a theme version into a **runtime bundle** consumed by the Storefront

## Entities
- **Theme**: Theme Store item (name/description/author)
- **ThemeVersion**: Uploaded version snapshot (manifest/status/build logs)
- **ThemeFile**: File metadata (path/size/hash) for a theme version
- **ThemeInstall**: Site binding (draftThemeVersionId, publishedThemeVersionId)

## Endpoints (current)
- `POST /api/themes/upload` (multipart, field `bundle`) + body `{ name, version?, description?, author? }`
- `GET /api/themes`
- `GET /api/themes/:themeId`
- `GET /api/themes/versions/:themeVersionId`
- `GET /api/themes/versions/:themeVersionId/files`
- `GET /api/themes/versions/:themeVersionId/file?path=...`
- `PUT /api/themes/versions/:themeVersionId/file?path=...` body `{ content }`
- `POST /api/themes/versions/:themeVersionId/build`
- `POST /api/sites/:siteId/theme/install` body `{ themeId, themeVersionId }`
- `GET /api/sites/:siteId/theme`
- `POST /api/sites/:siteId/theme/publish` body `{ themeVersionId?, actor? }`
- `POST /api/sites/:siteId/theme/rollback` body `{ toThemeVersionId, actor? }`
- `GET /api/sites/:siteId/theme/audits`
- `GET /api/sites/:siteId/theme/settings`
- `PUT /api/sites/:siteId/theme/settings/draft` body `{ themeVersionId?, settings }`
- `POST /api/sites/:siteId/theme/settings/publish` body `{ themeVersionId? }`
- `GET /api/themes/build-jobs/:jobId` (durable build job status from DB)

## Storage (temporary)
Theme sources are stored on local filesystem under:
- `storage/themes/<themeVersionId>/src/**`

Build outputs are written under:
- `storage/themes/<themeVersionId>/build/theme.cjs` (CJS bundle for SSR runtime)

The build step bundles a **generated wrapper entry** that exports:
- `default`: Theme layout component (recommended to accept `children`)
- `manifest`: the theme manifest JSON (from DB)
- `templates`: `{ [templateId]: ReactComponent }` where `templateId` comes from `manifest.routes[].template`

This will be migrated into a richer `StorageProvider` abstraction (S3 compatible) later.

## Durable build queue (enterprise)
- Producer: `ThemeBuildQueueService` writes a durable `ThemeBuildJob` record and enqueues a BullMQ job (Redis).
- Worker: run as separate process (no HTTP): `nx run api:worker`
- Idempotency: only one active build job (QUEUED/RUNNING) per `themeVersionId` is allowed at a time.
- Env:
  - `REDIS_URL` (or `REDIS_HOST/REDIS_PORT/REDIS_PASSWORD/REDIS_DB`)
  - `THEME_BUILD_CONCURRENCY` (default 2)
  - `THEME_BUILD_ATTEMPTS` (default 3)
- Migration (prod): `apps/api/src/migrations/1737675000000-create-theme-build-jobs.ts`

## Changelog
- 2026-01-24: Theme build now exports `manifest` + `templates` to enable storefront manifest-driven routing.
- 2026-01-24: Added per-site theme settings (draft + published) backed by StorageProvider.
- 2026-01-24: Replaced in-memory build queue with durable BullMQ+Redis queue + separate worker; persisted job status in `theme_build_jobs`.


