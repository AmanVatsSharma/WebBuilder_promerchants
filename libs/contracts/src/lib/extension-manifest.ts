/**
 * File: libs/contracts/src/lib/extension-manifest.ts
 * Module: contracts
 * Purpose: Runtime validation/helpers for ExtensionManifestV1 (shared by API and Storefront)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Keep dependency-free (no zod) for minimal runtime surface
 * - Prefer `assertExtensionManifestV1()` at boundaries (API upload/build, storefront load)
 */

import type { ExtensionManifestV1 } from './contracts';

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

export function parseExtensionManifestV1(input: unknown): ValidationResult<ExtensionManifestV1> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['manifest: must be an object'] };
  }

  const schemaVersion = input['schemaVersion'];
  if (schemaVersion !== 1) pushErr(errors, 'schemaVersion', 'must be 1');
  if (!isNonEmptyString(input['name'])) pushErr(errors, 'name', 'must be a non-empty string');
  if (!isNonEmptyString(input['version'])) pushErr(errors, 'version', 'must be a non-empty string');

  const blocks = input['blocks'];
  if (blocks !== undefined) {
    if (!Array.isArray(blocks)) {
      pushErr(errors, 'blocks', 'must be an array');
    } else {
      blocks.forEach((b, i) => {
        const p = `blocks[${i}]`;
        if (!isRecord(b)) {
          pushErr(errors, p, 'must be an object');
          return;
        }
        if (!isNonEmptyString(b['type'])) pushErr(errors, `${p}.type`, 'must be a non-empty string');
        if (!isNonEmptyString(b['label'])) pushErr(errors, `${p}.label`, 'must be a non-empty string');
        if (!isNonEmptyString(b['entry'])) pushErr(errors, `${p}.entry`, 'must be a non-empty string');
      });
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: input as unknown as ExtensionManifestV1 };
}

export function assertExtensionManifestV1(input: unknown): ExtensionManifestV1 {
  const res = parseExtensionManifestV1(input);
  if (res.ok === false) {
    const msg = res.errors.join('; ');
    throw new Error(`Invalid ExtensionManifestV1: ${msg}`);
  }
  return res.value;
}

