# Domains Module

## Purpose
Maps **custom domains (hosts)** to a **Site** for SSR multi-tenant storefront routing.

## Key Entity
- **DomainMapping**: `{ host, siteId, status }`

## Current Flows
1. **Create mapping**: `POST /api/domains`
2. **Resolve host** (used by storefront middleware): `GET /api/domains/resolve?host=example.com`
3. **Verify mapping** (manual trigger): `POST /api/domains/:id/verify`
   - Strategy payload supports:
     - `AUTO` (localhost fast-path, otherwise DNS A)
     - `DNS_A`
     - `DNS_TXT` (`txtRecordName`, `txtExpectedValue`)
     - `HTTP` (`httpPath`, `httpExpectedBodyIncludes`, `timeoutMs`)

## Notes
- Verification states remain `PENDING|VERIFIED|FAILED`, with strategy-based verification providers enabling DNS/HTTP challenge expansion.
- `host` is normalized (lowercased, port stripped) to keep lookups deterministic.

## Changelog
- 2026-02-16: Added strategy-based domain verification service with `AUTO`, `DNS_A`, `DNS_TXT`, and `HTTP` challenge modes plus new unit tests.
- 2026-02-16: Added `POST /api/domains/:id/verify` to perform on-demand DNS A-record checks and update mapping status/error state.


