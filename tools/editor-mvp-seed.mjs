/**
 * File: tools/editor-mvp-seed.mjs
 * Module: tools
 * Purpose: Seed deterministic local data for editor-first MVP validation
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = process.env.WEBBUILDER_API_BASE || 'http://localhost:3000/api';
const BUILDER_BASE = process.env.WEBBUILDER_BUILDER_BASE || 'http://localhost:4200';
const STOREFRONT_BASE = process.env.WEBBUILDER_STOREFRONT_BASE || 'http://localhost:4201';

const SITE_NAME = 'MVP Local Demo';
const SITE_DOMAIN = 'mvp.localhost';
const PAGE_TITLE = 'Home';
const PAGE_SLUG = 'home';

function logStep(message, data) {
  const suffix = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[mvp-seed] ${message}${suffix}`);
}

async function request(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed (${res.status}): ${text}`);
  }
  return payload;
}

async function getOrCreateSite() {
  const sites = await request('/sites');
  const existing = Array.isArray(sites)
    ? sites.find((s) => s && s.name === SITE_NAME)
    : null;
  if (existing) {
    logStep('site.exists', { siteId: existing.id });
    return existing;
  }
  const created = await request('/sites', {
    method: 'POST',
    body: JSON.stringify({ name: SITE_NAME, domain: SITE_DOMAIN }),
  });
  logStep('site.created', { siteId: created.id });
  return created;
}

async function getOrCreateHomePage(siteId) {
  const pages = await request(`/sites/${encodeURIComponent(siteId)}/pages`);
  const existing = Array.isArray(pages)
    ? pages.find((p) => p && p.slug === PAGE_SLUG)
    : null;
  if (existing) {
    logStep('page.exists', { pageId: existing.id, slug: existing.slug });
    return existing;
  }
  const created = await request(`/sites/${encodeURIComponent(siteId)}/pages`, {
    method: 'POST',
    body: JSON.stringify({
      title: PAGE_TITLE,
      slug: PAGE_SLUG,
    }),
  });
  logStep('page.created', { pageId: created.id, slug: created.slug });
  return created;
}

async function waitForBuild(jobId) {
  for (let i = 0; i < 90; i += 1) {
    const job = await request(`/themes/build-jobs/${encodeURIComponent(jobId)}`);
    logStep('build.poll', { jobId, status: job.status, attempt: i + 1 });
    if (job.status === 'SUCCEEDED') return job;
    if (job.status === 'FAILED') {
      throw new Error(`Theme build failed: ${job.error || 'Unknown error'}`);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1000));
  }
  throw new Error(`Theme build timeout for jobId=${jobId}`);
}

async function seedTheme(siteId) {
  const seeded = await request('/themes/seed/default', { method: 'POST' });
  const themeId = seeded?.theme?.id;
  const themeVersionId = seeded?.themeVersion?.id;
  if (!themeId || !themeVersionId) {
    throw new Error('Theme seed response missing themeId/themeVersionId');
  }
  logStep('theme.seeded', { themeId, themeVersionId });

  const build = await request(`/themes/versions/${encodeURIComponent(themeVersionId)}/build`, {
    method: 'POST',
  });
  const jobId = build?.jobId;
  if (!jobId) throw new Error('Theme build did not return jobId');
  await waitForBuild(jobId);
  logStep('theme.built', { themeVersionId, jobId });

  await request(`/sites/${encodeURIComponent(siteId)}/theme/install`, {
    method: 'POST',
    body: JSON.stringify({ themeId, themeVersionId }),
  });
  logStep('theme.installed', { siteId, themeVersionId });

  await request(`/sites/${encodeURIComponent(siteId)}/theme/publish`, {
    method: 'POST',
    body: JSON.stringify({ themeVersionId, actor: 'mvp-seed-script' }),
  });
  logStep('theme.published', { siteId, themeVersionId });

  return { themeId, themeVersionId };
}

async function publishPages(siteId, pages) {
  for (const page of pages) {
    await request(`/sites/pages/${encodeURIComponent(page.id)}/publish`, { method: 'POST' });
    logStep('page.published', { pageId: page.id, slug: page.slug });
  }
}

async function main() {
  logStep('start', { apiBase: API_BASE });
  const site = await getOrCreateSite();
  const page = await getOrCreateHomePage(site.id);

  const pages = await request(`/sites/${encodeURIComponent(site.id)}/pages`);
  const { themeId, themeVersionId } = await seedTheme(site.id);
  await publishPages(site.id, Array.isArray(pages) ? pages : [page]);
  await request(`/commerce/sites/${encodeURIComponent(site.id)}/products/seed`, {
    method: 'POST',
  });
  logStep('commerce.seeded', { siteId: site.id });

  const output = {
    seededAt: new Date().toISOString(),
    apiBase: API_BASE,
    builderBase: BUILDER_BASE,
    storefrontBase: STOREFRONT_BASE,
    siteId: site.id,
    siteName: site.name,
    pageId: page.id,
    pageSlug: page.slug,
    themeId,
    themeVersionId,
    urls: {
      editor: `${BUILDER_BASE}/editor/${page.id}`,
      pagePreview: `${BUILDER_BASE}/preview/${page.id}`,
      publishCenter: `${BUILDER_BASE}/sites/${site.id}/publish`,
      storefrontPublished: `${STOREFRONT_BASE}/`,
      storefrontThemePreview: `${STOREFRONT_BASE}/?previewThemeVersionId=${themeVersionId}`,
    },
  };

  const outDir = resolve(process.cwd(), 'storage', 'local-validation');
  await mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, 'seed-output.json');
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf-8');
  logStep('done', output);
  logStep('saved', { path: outPath });
}

main().catch((error) => {
  console.error('[mvp-seed] failed', error);
  process.exit(1);
});
