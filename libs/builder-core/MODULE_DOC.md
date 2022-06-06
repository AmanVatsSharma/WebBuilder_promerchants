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

## Changelog
- 2026-02-15: Added essential editor block set (`RichTextBlock`, `ButtonBlock`, `ImageBlock`, `GridSection`, `FormBlock`, `TestimonialSection`, `ProductListSection`, `CtaBannerSection`, `FaqSection`, `NavbarSection`, `FooterSection`) and registered all in core registry.
- 2026-02-15: Extended `HeroSection` and `TextBlock` with optional inline `style` support so builder visual controls can drive live rendering.
- 2026-01-24: HeroSection now supports optional `backgroundImageUrl` (used by builder media picker via propsSchema field type `media`).
