/**
 * File: apps/storefront/src/app/page.tsx
 * Module: storefront
 * Purpose: Tenant-aware homepage (SSR)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - For now, renders a page from existing Sites/Pages API (slug=home fallback)
 * - Once Themes are live, this will render published theme templates instead
 */

import { headers } from 'next/headers';
import { PageRenderer, registerCoreComponents } from '@web-builder/builder-core';
import { resolveInstalledThemeVersion, resolvePageContentBySlug, resolveSiteByHost } from '../lib/tenant';
import { loadThemeComponent } from '../lib/theme-runtime';

registerCoreComponents();

export default async function Home({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const h = await headers();
  const host = h.get('x-tenant-host') || h.get('host') || 'unknown';

  const site = await resolveSiteByHost(host);
  if (!site) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Storefront</h1>
        <p>Tenant not found for host: {host}</p>
      </main>
    );
  }

  const sp = (await searchParams) || {};
  const previewThemeVersionId = typeof sp.previewThemeVersionId === 'string' ? sp.previewThemeVersionId : null;

  // Published only, unless previewThemeVersionId is explicitly provided (builder preview mode)
  const installed = await resolveInstalledThemeVersion(site.id);
  const themeVersionId = previewThemeVersionId || installed?.published || null;
  if (themeVersionId) {
    const ThemeRoot = await loadThemeComponent(themeVersionId);
    if (ThemeRoot) {
      return (
        <main>
          <ThemeRoot />
        </main>
      );
    }
  }

  if (installed?.published && !themeVersionId) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{site.name}</h1>
        <p>Theme is published but could not be loaded.</p>
        <p style={{ opacity: 0.7 }}>publishedThemeVersionId={installed.published}</p>
      </main>
    );
  }

  const content = await resolvePageContentBySlug(site.id, 'home');
  if (!content) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{site.name}</h1>
        <p>No pages found yet. Create a page for this site in the Builder.</p>
        <p style={{ opacity: 0.7 }}>host={host} siteId={site.id}</p>
      </main>
    );
  }

  return (
    <main>
      <PageRenderer content={content} />
    </main>
  );
}
