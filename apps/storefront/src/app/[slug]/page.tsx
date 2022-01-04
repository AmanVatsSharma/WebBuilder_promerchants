/**
 * File: apps/storefront/src/app/[slug]/page.tsx
 * Module: storefront
 * Purpose: Tenant-aware dynamic page rendering by slug (SSR)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Temporary: renders stored page layout JSON using builder-core renderer
 * - Future: this route will map to published theme templates and commerce data
 */

import { headers } from 'next/headers';
import { PageRenderer, registerCoreComponents } from '@web-builder/builder-core';
import { resolveInstalledThemeVersion, resolvePageContentBySlug, resolveSiteByHost } from '../../lib/tenant';
import { loadThemeComponent } from '../../lib/theme-runtime';

registerCoreComponents();

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
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

  const content = await resolvePageContentBySlug(site.id, slug);
  if (!content) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{site.name}</h1>
        <p>Page not found: /{slug}</p>
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


