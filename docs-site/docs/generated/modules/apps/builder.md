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
- 2026-02-16: Added domain challenge SLO dashboard panel on home route with success-rate/retry/alert signal cards and recent alert feed for investor-demo operations visibility.
- 2026-02-16: Builder API helper now supports bearer auth propagation (`NEXT_PUBLIC_API_AUTH_TOKEN`) for JWT auth-context guard environments.
- 2026-02-16: Theme upload panel now captures marketplace metadata (`FREE/PAID`, price, currency, license, listed toggle) for theme store governance narratives.
- 2026-02-16: Builder API helper now forwards optional `x-actor-id` (`NEXT_PUBLIC_ACTOR_ID`) for site-ownership authorization guard compatibility.
- 2026-02-16: Builder API helper now auto-attaches `x-site-id` for site-scoped routes and optional `x-api-key` (`NEXT_PUBLIC_API_AUTH_KEY`) to support API auth/scope guards.
- 2026-02-16: Added container image template at `apps/builder/Dockerfile` for production-style builder deployment via docker compose.
- 2026-02-16: Added per-domain Verify action in project dashboard so sellers can trigger domain status checks directly from builder UI.
- 2026-02-16: Removed stale `@ts-expect-error` in theme settings editor defaults to restore strict Next.js production TypeScript builds.
- 2026-02-16: Fixed deep-route import paths in editor/template layout clients so Next production webpack builds resolve shared API/media modules correctly.
- 2026-02-16: Added Theme Store bundle upload UI (metadata + zip upload) and domain mapping controls on dashboard projects for site-level domain setup visibility.
- 2026-02-15: Replaced builder home with a real project dashboard (site/page creation, editor/preview/publish entry paths) and added local MVP seed/validation scripts (`npm run mvp:seed`, `npm run mvp:validate`).
- 2026-02-15: Upgraded `/editor/[pageId]` with layer tree, multi-select, duplicate/copy/paste shortcuts, viewport-aware visual design controls, and side-by-side live preview.
- 2026-02-15: Polished publish/theme workflows with readiness snapshots, theme audit visibility, rollback controls, and improved theme version editor telemetry/search/unsaved-state UX.
- 2026-01-24: Theme version editor can seed a demo product via Commerce API for faster end-to-end theme testing.
- 2026-01-24: Editor palette now loads from theme manifest sections, supports nested drag-reorder, and autosaves edits.
