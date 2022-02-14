# Theme SDK

## Purpose
Defines the **allowed import surface** for theme authors. Theme bundles should import only from:
- `react`
- `@web-builder/theme-sdk`

This keeps themes portable and lets the platform safely compile/run uploaded theme code.

## Key Exports
- Provider:
  - `ThemeSdkProvider`
- Hooks:
  - `useSite()`, `useProducts()`, `useCart()`, `useThemeSettings()`
- Components:
  - `Header`, `Footer`, `ProductCard`, `Money`, `Image`, `Link`

## Commerce Adapter Boundary
The SDK is built around a `CommerceAdapter` interface so the storefront can provide real ecommerce data later.

Recommended reading:
- `libs/theme-sdk/src/lib/theme-sdk.tsx`
- `libs/theme-sdk/src/lib/types.ts`

## Changelog
- 2026-01-24: ThemeSdkProvider now accepts `settings` and exposes them via `useThemeSettings()`.


