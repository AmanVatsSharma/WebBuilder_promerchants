---
sidebar_position: 21
---

# Runbook: Theme Build & Runtime Debugging

## Symptoms
- Build returns `FAILED`
- Storefront shows fallback content instead of theme
- Preview works but publish doesn’t (or vice versa)

## Where to look
- API build status/logs are stored on `ThemeVersion.buildLog`
- Theme artifacts:
  - `storage/themes/<themeVersionId>/build/theme.cjs`
  - `storage/themes/<themeVersionId>/src/**`

## Common causes
- Disallowed imports (allowlist enforced)
- Missing `manifest.json` or missing `entry` field
- Theme build output missing (never ran build)

## Commands
- Seed default theme:
  - `POST /api/themes/seed/default`
- Build a theme version:
  - `POST /api/themes/versions/:themeVersionId/build`
- Install draft for a site:
  - `POST /api/sites/:siteId/theme/install`
- Publish:
  - `POST /api/sites/:siteId/theme/publish`

## Preview override
You can preview an unpublished theme build using:
`/?previewThemeVersionId=<themeVersionId>`

