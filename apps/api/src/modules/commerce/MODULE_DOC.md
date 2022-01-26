# Commerce Module

## Purpose
Provides a minimal **commerce backend** for SMB MVP so themes can render real data:
- Products (catalog)
- Cart (add line items)

This is intentionally small and is designed to be replaceable by a headless commerce integration later.

## Endpoints (v1)
- `GET /api/commerce/sites/:siteId/products`
- `POST /api/commerce/sites/:siteId/products/seed`
- `GET /api/commerce/sites/:siteId/cart`
- `POST /api/commerce/sites/:siteId/cart/lines` body `{ productId, quantity }`

## Entities
- `Product`: minimal catalog per site
- `Cart`: single “active cart” per site (v1 simplification)

## Notes
- Tenant boundaries are enforced via `siteId` in all queries.
- Future: introduce `customerId`/`cartId` and multi-currency/variants/inventory.

## Changelog
- 2026-01-24: Initial commerce MVP (products + cart) for Theme SDK adapter.

