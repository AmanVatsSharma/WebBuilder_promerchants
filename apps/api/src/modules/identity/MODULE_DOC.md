# Identity Module

## Purpose
Provides foundational identity and tenant membership primitives:

- owner registration (user + workspace bootstrap)
- login and JWT issuance
- workspace membership claims for downstream authorization guards

## Entities
- **User**
- **Workspace**
- **WorkspaceMembership**
- **AuthSession** (refresh-token hash, expiry, revocation state)

## Endpoints
- `POST /api/auth/register`
  - creates owner user, workspace, owner membership
- `POST /api/auth/login`
  - validates credentials and issues HS256 JWT with `sub` + `workspaceIds`
- `POST /api/auth/refresh`
  - rotates refresh token and issues new access token
- `POST /api/auth/logout`
  - revokes refresh-token session
- `GET /api/auth/jwks`
  - exposes key metadata (`kid`, alg, secret fingerprint) for verifier coordination
- `POST /api/auth/introspect`
  - server-side token validity + claims introspection
- `GET /api/auth/oidc/discovery`
  - fetches and caches configured external OIDC discovery document
- `GET /api/auth/oidc/jwks`
  - fetches and caches configured external OIDC JWKS for interoperability wiring

## Notes
- JWT signing uses `AUTH_JWT_SECRET`.
- Optional key rotation:
  - `AUTH_JWT_ACTIVE_KID`
  - `AUTH_JWT_SECRETS_JSON` (kid->secret map)
- Optional external OIDC bridge:
  - `AUTH_OIDC_DISCOVERY_URL`
  - `AUTH_OIDC_JWKS_URL`
  - `AUTH_OIDC_CACHE_TTL_MS`
- Optional claim constraints:
  - `AUTH_JWT_ISSUER`
  - `AUTH_JWT_AUDIENCE`
- TTL:
  - `AUTH_JWT_TTL_SECONDS` (default 3600)
  - `AUTH_REFRESH_TTL_SECONDS` (default 1209600 / 14 days)

## Changelog
- 2026-02-16: Added optional OIDC discovery/JWKS proxy endpoints with cache to ease external identity provider interoperability rollouts.
- 2026-02-16: Added JWKS-style metadata endpoint (`/auth/jwks`) and token introspection endpoint (`/auth/introspect`) for external verifier interoperability.
- 2026-02-16: Added optional JWT key-rotation support via `kid` headers and env-driven secret keyring (`AUTH_JWT_ACTIVE_KID`, `AUTH_JWT_SECRETS_JSON`).
- 2026-02-16: Added refresh-token session persistence with token rotation (`/auth/refresh`) and revocation (`/auth/logout`) endpoints.
- 2026-02-16: Added identity subsystem baseline (user/workspace/membership persistence + register/login token issuance).

