/**
 * @file theme-build-mode.ts
 * @module themes
 * @description Build mode helpers for theme build execution strategy (queue vs inline)
 * @author BharatERP
 * @created 2026-02-16
 */

function normalizeMode(value: string | undefined) {
  return (value || '').trim().toLowerCase();
}

/**
 * Inline mode runs build execution inside API process.
 * Useful for local/e2e environments without Redis + worker.
 */
export function isInlineThemeBuildMode() {
  const explicit = normalizeMode(process.env.THEME_BUILD_MODE);
  if (explicit === 'inline') return true;
  if (explicit === 'queue') return false;

  // Safe default for sqljs-driven e2e/dev contexts.
  return process.env.DB_TYPE === 'sqljs';
}

