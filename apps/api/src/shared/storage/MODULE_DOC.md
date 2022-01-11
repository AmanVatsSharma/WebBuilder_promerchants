# Storage Module (API Shared)

## Purpose
Provides a **StorageProvider** abstraction for the API, used by:
- Themes: theme sources and build artifacts
- Future: uploads, media assets, exports, backups

## Current Implementation
- `LocalFsStorageProvider` writes to local filesystem under:
  - `STORAGE_DIR` env var, or default `<repo>/storage`

## Public Surface
- DI token: `STORAGE_PROVIDER` (`apps/api/src/shared/storage/storage.constants.ts`)
- Interface: `StorageProvider` (`apps/api/src/shared/storage/storage.types.ts`)
- Module: `StorageModule` (`apps/api/src/shared/storage/storage.module.ts`)

## Storage Layout (current)
- `storage/themes/<themeVersionId>/src/**` theme source files (extracted or seeded)
- `storage/themes/<themeVersionId>/build/theme.cjs` compiled theme bundle (esbuild output)

## Security Notes
- Storage keys are treated as **untrusted input** and guarded against path traversal.
- In production, we will swap `LocalFsStorageProvider` for an S3-compatible provider.

