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

## Preview Support
- Builder can open: `/?previewThemeVersionId=<id>` to preview an unpublished build.

## Notes
- For dev fallback, tenant resolution may fall back to `Site.domain` or first site.

