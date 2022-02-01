# Builder App (Next.js)

## Purpose
The **seller-facing editor** for:
- Page building (WYSIWYG canvas)
- Theme file editing (Monaco)
- Build/Install/Publish workflows

## Key Routes
- `/editor/[pageId]`: WYSIWYG editor (history + DnD foundations)
- `/preview/[pageId]`: page JSON preview
- `/themes`: Theme Store list + seed default theme
- `/themes/versions/[themeVersionId]`: file editor + build/install/publish

## Developer Notes
- API calls go through `/api/*` rewrite to Nest API.
- Builder production build is forced to webpack via `apps/builder/project.json`.

## Changelog
- 2026-01-24: Theme version editor can seed a demo product via Commerce API for faster end-to-end theme testing.
