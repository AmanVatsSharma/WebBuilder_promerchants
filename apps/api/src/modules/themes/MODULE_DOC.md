# Themes Module

## Purpose
Provides **Theme Store** and **theme file management** for the builder/storefront platform.

This module supports:
- Uploading a **theme bundle** (zip)
- Extracting and tracking **theme files**
- Reading/updating files (for web editor)
- Installing a theme version for a **Site** (draft selection)

## Entities
- **Theme**: Theme Store item (name/description/author)
- **ThemeVersion**: Uploaded version snapshot (manifest/status/build logs)
- **ThemeFile**: File metadata (path/size/hash) for a theme version
- **ThemeInstall**: Site binding (draftThemeVersionId, publishedThemeVersionId)

## Endpoints (current)
- `POST /api/themes/upload` (multipart, field `bundle`) + body `{ name, version?, description?, author? }`
- `GET /api/themes`
- `GET /api/themes/:themeId`
- `GET /api/themes/versions/:themeVersionId/files`
- `GET /api/themes/versions/:themeVersionId/file?path=...`
- `PUT /api/themes/versions/:themeVersionId/file?path=...` body `{ content }`
- `POST /api/sites/:siteId/theme/install` body `{ themeId, themeVersionId }`
- `GET /api/sites/:siteId/theme`

## Storage (temporary)
Theme sources are stored on local filesystem under:
- `storage/themes/<themeVersionId>/src/**`

This will be migrated into a `StorageProvider` abstraction (S3 compatible) in the next todo.


