/**
 * File: tools/docs-sync.mjs
 * Module: docs
 * Purpose: Sync in-module documentation into Docusaurus docs-site
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Source of truth remains in modules as MODULE_DOC.md (and nearby docs)
 * - This script copies them into docs-site/docs/generated/* so Docusaurus can render them
 * - Intentionally verbose logs for easy debugging in CI
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const outRoot = path.join(repoRoot, 'docs-site', 'docs', 'generated');

const sources = [
  { label: 'api-sites', from: 'apps/api/src/modules/sites/MODULE_DOC.md', to: 'modules/api/sites.md' },
  { label: 'api-domains', from: 'apps/api/src/modules/domains/MODULE_DOC.md', to: 'modules/api/domains.md' },
  { label: 'api-themes', from: 'apps/api/src/modules/themes/MODULE_DOC.md', to: 'modules/api/themes.md' },
  { label: 'api-storage', from: 'apps/api/src/shared/storage/MODULE_DOC.md', to: 'modules/api/storage.md' },
  { label: 'builder-app', from: 'apps/builder/MODULE_DOC.md', to: 'modules/apps/builder.md' },
  { label: 'storefront-app', from: 'apps/storefront/MODULE_DOC.md', to: 'modules/apps/storefront.md' },
  { label: 'builder-core', from: 'libs/builder-core/MODULE_DOC.md', to: 'modules/libs/builder-core.md' },
  { label: 'contracts', from: 'libs/contracts/MODULE_DOC.md', to: 'modules/libs/contracts.md' },
  { label: 'theme-sdk', from: 'libs/theme-sdk/MODULE_DOC.md', to: 'modules/libs/theme-sdk.md' },
  { label: 'default-theme', from: 'libs/default-theme/MODULE_DOC.md', to: 'modules/libs/default-theme.md' },
];

async function copyFile(fromRel, toRel) {
  const fromAbs = path.join(repoRoot, fromRel);
  const toAbs = path.join(outRoot, toRel);
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  const data = await fs.readFile(fromAbs, 'utf-8');
  await fs.writeFile(toAbs, data, 'utf-8');
  console.log(`[docs-sync] copied ${fromRel} -> ${path.relative(repoRoot, toAbs)}`);
}

async function main() {
  console.log('[docs-sync] start');
  await fs.mkdir(outRoot, { recursive: true });
  for (const s of sources) {
    try {
      await copyFile(s.from, s.to);
    } catch (e) {
      console.error(`[docs-sync] failed label=${s.label}`, e);
      process.exitCode = 1;
    }
  }
  console.log('[docs-sync] done');
}

await main();


