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

## Runtime contract
- Storefront treats `theme/entry.tsx` as the **Layout** component and injects the matched template as `children`.
- Storefront can pass an optional `sdk` prop (e.g. `sdk.settings`) down to the theme layout so it can configure `ThemeSdkProvider`.

## How it’s installed
The API exposes `POST /api/themes/seed/default` which reads these files and creates:
- `Theme`
- `ThemeVersion`
- `ThemeFile` records
- theme source files stored under `storage/themes/<themeVersionId>/src/**`

## Changelog
- 2026-01-24: Theme entry accepts `children` and optional `sdk` to support manifest-driven routing + settings injection.


