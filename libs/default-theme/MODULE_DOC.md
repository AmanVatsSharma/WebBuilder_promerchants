# Default Ecommerce Theme

## Purpose
Provides a **starter ecommerce theme** that ships with the platform.

This theme is authored in **React** and imports only from:
- `react`
- `@web-builder/theme-sdk`

## Files
- `theme/manifest.json`: Theme manifest (name/version/entry/settings)
- `theme/entry.tsx`: Theme entry (root layout)
- `theme/pages/home.tsx`: Homepage template (product grid)

## How it’s installed
The API exposes `POST /api/themes/seed/default` which reads these files and creates:
- `Theme`
- `ThemeVersion`
- `ThemeFile` records
- theme source files stored under `storage/themes/<themeVersionId>/src/**`


