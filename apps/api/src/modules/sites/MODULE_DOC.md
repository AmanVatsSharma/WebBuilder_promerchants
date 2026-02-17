# Sites Module

## Purpose
Manages user sites and pages. The core of the Web Builder, as it stores the page structure (JSON) used by the frontend renderer.

## Entities
- **Site**: Represents a website project.
  - Supports optional `ownerId` and `workspaceId` metadata for tenant authorization checks.
- **Page**: Represents a single page within a site. Stores `content` (JSON tree).

## Flows
1. **Create Site**: User starts a new project.
2. **Add Page**: User adds a page to the site.
3. **Save Page**: Editor sends updated JSON content to `PUT /sites/pages/:id`.
4. **Load Page**: Editor/Preview fetches JSON content from `GET /sites/pages/:id`.
5. **Publish Page**: Builder snapshots draft content into published content via `POST /sites/pages/:id/publish`. Storefront reads published by default.

## Data Structure (Page Content)
The `content` field is a JSON object following the Component Registry schema:
```json
{
  "root": {
    "type": "Container",
    "children": [
      {
        "type": "HeroSection",
        "props": { "title": "Welcome" }
      }
    ]
  }
}
```

## Changelog
- 2026-02-16: Added optional `workspaceId` and auth-context-aware site filtering (workspace membership first, owner fallback).
- 2026-02-16: Added optional `ownerId` on sites plus actor-aware create/list/get service paths to support ownership-based tenant authorization.
- 2026-02-16: Switched `publishedAt` column to sqljs-compatible datetime type in local/e2e while retaining timestamptz in Postgres.
- 2026-01-24: Added page publishing (`publishedContent`, `publishedAt`) and `POST /sites/pages/:id/publish` to support draft vs published page serving.
