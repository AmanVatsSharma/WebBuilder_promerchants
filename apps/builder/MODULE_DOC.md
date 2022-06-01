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
- 2026-02-15: Replaced builder home with a real project dashboard (site/page creation, editor/preview/publish entry paths) and added local MVP seed/validation scripts (`npm run mvp:seed`, `npm run mvp:validate`).
- 2026-02-15: Upgraded `/editor/[pageId]` with layer tree, multi-select, duplicate/copy/paste shortcuts, viewport-aware visual design controls, and side-by-side live preview.
- 2026-02-15: Polished publish/theme workflows with readiness snapshots, theme audit visibility, rollback controls, and improved theme version editor telemetry/search/unsaved-state UX.
- 2026-01-24: Theme version editor can seed a demo product via Commerce API for faster end-to-end theme testing.
- 2026-01-24: Editor palette now loads from theme manifest sections, supports nested drag-reorder, and autosaves edits.
