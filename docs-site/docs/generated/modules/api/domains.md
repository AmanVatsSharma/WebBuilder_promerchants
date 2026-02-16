# Domains Module

## Purpose
Maps **custom domains (hosts)** to a **Site** for SSR multi-tenant storefront routing.

## Key Entity
- **DomainMapping**: `{ host, siteId, status }`

## Current Flows
1. **Create mapping**: `POST /api/domains`
2. **Resolve host** (used by storefront middleware): `GET /api/domains/resolve?host=example.com`
3. **Verify mapping** (manual trigger): `POST /api/domains/:id/verify`

## Notes
- Verification is currently simplified (`PENDING|VERIFIED|FAILED`). We will extend this into DNS/HTTP challenge flows.
- `host` is normalized (lowercased, port stripped) to keep lookups deterministic.

## Changelog
- 2026-02-16: Added `POST /api/domains/:id/verify` to perform on-demand DNS A-record checks and update mapping status/error state.


