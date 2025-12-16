/**
 * File: libs/contracts/src/lib/contracts.ts
 * Module: contracts
 * Purpose: Shared contracts/types used across API, Builder, and Storefront
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Read this file first to understand canonical JSON shapes (PageContent, ThemeManifest)
 * - Keep these types stable; version via schemaVersion fields
 */

/**
 * Page builder content model
 * - This is the JSON stored in DB (e.g., pages.content) and edited by the builder
 * - A theme may define components/sections that are referenced by `type`
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PageNode {
  /** Stable ID used by editor selection/history */
  id: string;
  /** Component key, resolved by component registry at render time */
  type: string;
  /** Serializable props (must be JSON) */
  props?: Record<string, JsonValue>;
  /** Child nodes for layout/sections */
  children?: PageNode[];
}

export interface PageContentV1 {
  schemaVersion: 1;
  root: PageNode;
}

/**
 * Theme model
 * - Theme code is uploaded as a bundle (zip) and compiled by ThemeBuildService
 * - Theme settings are JSON (validated by schema) and applied at render time
 */
export type ThemeVersionStatus = 'DRAFT' | 'BUILDING' | 'BUILT' | 'PUBLISHED' | 'FAILED';

export interface ThemeSettingsSchemaV1 {
  schemaVersion: 1;
  groups: Array<{
    id: string;
    label: string;
    fields: Array<
      | { type: 'color'; id: string; label: string; default: string }
      | { type: 'text'; id: string; label: string; default: string }
      | { type: 'select'; id: string; label: string; default: string; options: Array<{ label: string; value: string }> }
      | { type: 'number'; id: string; label: string; default: number; min?: number; max?: number }
    >;
  }>;
}

export interface ThemeManifestV1 {
  schemaVersion: 1;
  /** Display name shown in Theme Store */
  name: string;
  /** Theme semantic version (theme author controlled) */
  version: string;
  /** Entry module (relative path inside the theme bundle) */
  entry: string;
  /** Optional supported routes/pages */
  routes?: Array<{ path: string; template: string }>;
  /** Settings schema (theme-level customization) */
  settingsSchema?: ThemeSettingsSchemaV1;
}

/**
 * Editor action model (foundation for undo/redo + future AI agent)
 * - Every editor mutation should be representable as an action.
 */
export type EditorAction =
  | { type: 'SelectNode'; nodeId: string | null }
  | { type: 'InsertNode'; parentId: string; index: number; node: PageNode }
  | { type: 'DeleteNode'; nodeId: string }
  | { type: 'MoveNode'; nodeId: string; newParentId: string; newIndex: number }
  | { type: 'UpdateNodeProps'; nodeId: string; patch: Record<string, JsonValue> };

