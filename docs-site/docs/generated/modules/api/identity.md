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

## Endpoints
- `POST /api/auth/register`
  - creates owner user, workspace, owner membership
- `POST /api/auth/login`
  - validates credentials and issues HS256 JWT with `sub` + `workspaceIds`

## Notes
- JWT signing uses `AUTH_JWT_SECRET`.
- Optional claim constraints:
  - `AUTH_JWT_ISSUER`
  - `AUTH_JWT_AUDIENCE`
- TTL:
  - `AUTH_JWT_TTL_SECONDS` (default 3600)

## Changelog
- 2026-02-16: Added identity subsystem baseline (user/workspace/membership persistence + register/login token issuance).

