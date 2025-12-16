# Builder Core

## Purpose
Provides the **rendering engine** and **component registry** used by:
- Builder (editor canvas + preview)
- Storefront (temporary fallback renderer)

## Key Concepts
- **ComponentRegistry**: maps `type` (string key) -> React component
- **PageContentV1**: canonical JSON model for page layout (from `@web-builder/contracts`)
- **PageRenderer**: recursive renderer that resolves nodes via registry

## Notes
- Typing is intentionally flexible (`ComponentType<any>`) because themes/components evolve dynamically.
- Editor selection overlays and DnD happen at the app layer (builder), not inside this library.

