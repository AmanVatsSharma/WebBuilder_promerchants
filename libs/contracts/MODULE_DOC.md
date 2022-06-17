# Contracts Library

## Purpose
Defines **stable, shared types** and **pure command functions** used by:
- `apps/api` (DTO alignment, theme manifests)
- `apps/builder` (editor state + actions)
- `apps/storefront` (rendering contracts)

## Key Types
- `PageContentV1`, `PageNode`: canonical page layout JSON model
- `ThemeManifestV1`: canonical theme manifest model
- `EditorAction`, `EditorActionEnvelope`: typed command format for editor mutations

## Command Layer (AI-agent readiness)
The editor mutation surface is implemented as **pure functions**:
- `applyEditorAction(content, action)`

This is intentional so a future AI agent can emit the **same actions** as the UI, with audit logging and replay.

## Recommended Reading
- `libs/contracts/src/lib/contracts.ts`
- `libs/contracts/src/lib/editor-engine.ts`

## Changelog
- 2026-02-15: Added `editor-engine.spec.ts` coverage for insert/update/delete/move behavior and subtree-move safety guard in editor action engine.

