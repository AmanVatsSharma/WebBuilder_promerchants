# Storefront App (Next.js SSR)

## Purpose
The **buyer-facing storefront** that serves many tenants (stores) from one deployment using **domain-based routing**.

## Tenant Resolution
1. Extract `Host` header
2. Resolve `host -> siteId` via Domains module: `GET /api/domains/resolve?host=...`
3. Load site via `GET /api/sites/:id`
4. Load installed theme (published, or preview override)

## Theme Runtime
- Loads compiled bundle from `storage/themes/<themeVersionId>/build/theme.cjs`
- Uses a strict allowlisted `require` in the VM sandbox
- Uses `manifest.routes[]` + exported `templates` to resolve which template renders for a given URL

## Preview Support
- Builder can open: `/?previewThemeVersionId=<id>` to preview an unpublished build.

## Notes
- For dev fallback, tenant resolution may fall back to `Site.domain` or first site.
- Storefront production builds are forced to webpack via `apps/storefront/project.json` for stable monorepo library resolution.

## Changelog
- 2026-02-16: Storefront API callers now attach optional `x-api-key` and scoped `x-site-id` headers to remain compatible when backend API/site-scope guards are enabled.
- 2026-02-16: Added container image template at `apps/storefront/Dockerfile` and validated webpack production build path for docker compose deployments.
- 2026-02-16: Removed static server imports of `@web-builder/theme-sdk` in runtime loaders, switching to sandbox `require()` to keep storefront server build compatible with hook-bearing client SDK modules.
- 2026-02-16: Added explicit storefront webpack build target to avoid Turbopack resolution failures with shared workspace libraries during CI/build.
- 2026-01-24: Storefront now supports manifest-driven template routing (with previewThemeVersionId).
