# Domains Module

## Purpose
Maps **custom domains (hosts)** to a **Site** for SSR multi-tenant storefront routing.

## Key Entity
- **DomainMapping**: `{ host, siteId, status }`

## Current Flows
1. **Create mapping**: `POST /api/domains`
2. **Resolve host** (used by storefront middleware): `GET /api/domains/resolve?host=example.com`

## Notes
- Verification is currently simplified (`PENDING|VERIFIED|FAILED`). We will extend this into DNS/HTTP challenge flows.
- `host` is normalized (lowercased, port stripped) to keep lookups deterministic.


