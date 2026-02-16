---
sidebar_position: 25
---

# Runbook: MVP Rollback

## Theme/content rollback (no infra rollback)

Use when deployment is healthy but a storefront/theme change needs immediate revert.

## Steps

1. Open Builder Publish Center for the affected site:
   - `/sites/:siteId/publish`
2. In **Rollback** section, choose previous theme version.
3. Execute **Rollback Theme**.
4. Confirm:
   - storefront renders previous stable version.
   - theme audit history has rollback entry.

## API path

```http
POST /api/sites/:siteId/theme/rollback
{
  "toThemeVersionId": "<previous-theme-version-id>",
  "actor": "ops"
}
```

## Full stack rollback (container level)

Use when runtime binaries/config change caused instability.

1. Stop stack:
   ```bash
   docker compose down
   ```
2. Checkout previous stable git commit/tag.
3. Rebuild and restart:
   ```bash
   docker compose up --build
   ```
4. Run health checks:
   - `GET /api/health`
   - builder/storefront page loads

## Data safety notes

- Theme source/build artifacts are stored under `storage/`.
- Database data remains unless volumes are explicitly removed.
- Avoid destructive `docker compose down -v` during emergency rollback unless planned.
