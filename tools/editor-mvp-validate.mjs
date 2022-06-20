/**
 * File: tools/editor-mvp-validate.mjs
 * Module: tools
 * Purpose: Validate local MVP API readiness from seeded data
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = process.env.WEBBUILDER_API_BASE || 'http://localhost:3000/api';
const seedPath =
  process.env.WEBBUILDER_SEED_OUTPUT ||
  resolve(process.cwd(), 'storage', 'local-validation', 'seed-output.json');

function logCheck(label, result, data) {
  const prefix = result ? 'PASS' : 'FAIL';
  const suffix = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[mvp-validate] ${prefix} ${label}${suffix}`);
}

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`GET ${path} failed (${res.status}): ${text}`);
  }
  return payload;
}

async function main() {
  const seedJson = await readFile(seedPath, 'utf-8');
  const seed = JSON.parse(seedJson);
  const siteId = seed?.siteId;
  const pageId = seed?.pageId;

  if (!siteId || !pageId) {
    throw new Error(`Invalid seed output. Expected siteId/pageId in ${seedPath}`);
  }

  const site = await request(`/sites/${encodeURIComponent(siteId)}`);
  logCheck('site.exists', Boolean(site?.id), { siteId });

  const pages = await request(`/sites/${encodeURIComponent(siteId)}/pages`);
  const home = Array.isArray(pages) ? pages.find((p) => p && p.id === pageId) : null;
  logCheck('page.exists', Boolean(home), { pageId });

  const install = await request(`/sites/${encodeURIComponent(siteId)}/theme`);
  logCheck(
    'theme.install.exists',
    Boolean(install?.themeId && (install?.draftThemeVersionId || install?.publishedThemeVersionId)),
    {
      themeId: install?.themeId,
      draftThemeVersionId: install?.draftThemeVersionId,
      publishedThemeVersionId: install?.publishedThemeVersionId,
    },
  );

  const audits = await request(`/sites/${encodeURIComponent(siteId)}/theme/audits`);
  logCheck('theme.audit.present', Array.isArray(audits) && audits.length > 0, {
    audits: Array.isArray(audits) ? audits.length : 0,
  });

  const products = await request(`/commerce/sites/${encodeURIComponent(siteId)}/products`);
  logCheck('commerce.products.seeded', Array.isArray(products) && products.length > 0, {
    products: Array.isArray(products) ? products.length : 0,
  });

  const publishedPage = await request(`/sites/pages/${encodeURIComponent(pageId)}?mode=published`);
  logCheck('page.publishedContent.available', Boolean(publishedPage?.content), {
    pageId,
  });

  console.log('[mvp-validate] ALL CHECKS COMPLETED');
}

main().catch((error) => {
  console.error('[mvp-validate] failed', error);
  process.exit(1);
});
