# Extensions Module

## Purpose
Provide a **Shopify-like extension system** for the web builder:
- Upload an extension bundle (zip)
- Validate `extension.manifest.json`
- Build the extension into a runtime bundle (CJS) in a restricted environment
- Install extension blocks (\"app blocks\") into a Site so the Builder can offer them in the palette

This is intentionally **v1-minimal**: blocks only (no webhooks, no admin UI embedding, no billing).

## Key Concepts
- **Extension**: marketplace/listing identity (name/author/description)
- **ExtensionVersion**: uploaded version with manifest + build status/logs
- **ExtensionInstall**: site binding (which extension version is installed/enabled)

## Storage layout (current)
- Sources: `storage/extensions/<extensionVersionId>/src/**`
- Build output: `storage/extensions/<extensionVersionId>/build/extension.cjs`

## Endpoints (v1)
- `POST /api/extensions/upload` (multipart, field `bundle`) + body `{ name, version?, description?, author? }`
- `GET /api/extensions`
- `GET /api/extensions/versions/:extensionVersionId`
- `POST /api/extensions/versions/:extensionVersionId/build`
- `POST /api/sites/:siteId/extensions/install` body `{ extensionId, extensionVersionId }`
- `GET /api/sites/:siteId/extensions/blocks` → blocks merged for builder palette

## Changelog
- 2026-02-16: Hardened extension bundle source path normalization to reject traversal, absolute, and unsafe paths before persistence/build.
- 2026-01-24: Initial extensions v1 (upload/build/install + site blocks feed).

