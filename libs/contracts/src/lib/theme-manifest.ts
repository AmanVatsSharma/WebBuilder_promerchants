/**
 * File: libs/contracts/src/lib/theme-manifest.ts
 * Module: contracts
 * Purpose: Runtime validation/helpers for ThemeManifestV1 (shared by API and Storefront)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Keep dependency-free (no zod) for minimal runtime surface
 * - Prefer `assertThemeManifestV1()` at boundaries (API build, runtime load)
 */

import type { ThemeManifestV1 } from './contracts';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function pushErr(errors: string[], path: string, msg: string) {
  errors.push(`${path}: ${msg}`);
}

export function parseThemeManifestV1(input: unknown): ValidationResult<ThemeManifestV1> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['manifest: must be an object'] };
  }

  const schemaVersion = input.schemaVersion;
  if (schemaVersion !== 1) pushErr(errors, 'schemaVersion', 'must be 1');

  if (!isNonEmptyString(input.name)) pushErr(errors, 'name', 'must be a non-empty string');
  if (!isNonEmptyString(input.version)) pushErr(errors, 'version', 'must be a non-empty string');
  if (!isNonEmptyString(input.entry)) pushErr(errors, 'entry', 'must be a non-empty string');

  const routes = input.routes;
  if (routes !== undefined) {
    if (!Array.isArray(routes)) {
      pushErr(errors, 'routes', 'must be an array');
    } else {
      routes.forEach((r, i) => {
        const p = `routes[${i}]`;
        if (!isRecord(r)) {
          pushErr(errors, p, 'must be an object');
          return;
        }
        if (!isNonEmptyString(r.path)) pushErr(errors, `${p}.path`, 'must be a non-empty string');
        if (isNonEmptyString(r.path) && !r.path.startsWith('/')) {
          pushErr(errors, `${p}.path`, 'must start with "/"');
        }
        if (!isNonEmptyString(r.template)) pushErr(errors, `${p}.template`, 'must be a non-empty string');
      });
    }
  }

  // settingsSchema is intentionally not deeply validated yet (will expand in later todos)

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: input as unknown as ThemeManifestV1,
  };
}

export function assertThemeManifestV1(input: unknown): ThemeManifestV1 {
  const res = parseThemeManifestV1(input);
  if (!res.ok) {
    const msg = res.errors.join('; ');
    throw new Error(`Invalid ThemeManifestV1: ${msg}`);
  }
  return res.value;
}

