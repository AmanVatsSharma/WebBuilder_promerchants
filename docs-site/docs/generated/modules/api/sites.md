# Sites Module

## Purpose
Manages user sites and pages. The core of the Web Builder, as it stores the page structure (JSON) used by the frontend renderer.

## Entities
- **Site**: Represents a website project.
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
- 2026-01-24: Added page publishing (`publishedContent`, `publishedAt`) and `POST /sites/pages/:id/publish` to support draft vs published page serving.
