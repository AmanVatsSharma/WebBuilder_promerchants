# Media Module

## Purpose
Manage **site media assets** (images/files) used by themes and builder content.

Backed by the shared `StorageProvider` so we can swap from local FS to S3/CDN later.

## Endpoints (v1)
- `POST /api/media/sites/:siteId/upload` (multipart, field `file`)
- `GET /api/media/sites/:siteId/list`
- `GET /api/media/sites/:siteId/file?key=...`

## Storage layout
- `sites/<siteId>/media/<filename>`

## Notes
- Keys returned by `list` are **safe server-generated keys**; do not accept arbitrary paths from clients without validation.

## Changelog
- 2026-01-24: Initial media upload/list/serve endpoints.
