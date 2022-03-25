/**
 * File: apps/storefront/src/app/products/[handle]/page.tsx
 * Module: storefront
 * Purpose: Product detail route resolved via theme manifest routing (SSR)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { headers } from 'next/headers';
import { resolveInstalledThemeVersion, resolveSiteByHost, resolveThemeLayout, resolveThemeSettings } from '../../../lib/tenant';
import { loadThemeModule } from '../../../lib/theme-runtime';
import { resolveTemplateMatchForPath } from '../../../lib/theme-routing';
import { createApiCommerceAdapter } from '../../../lib/commerce-adapter';

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle } = await params;
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

  const installed = await resolveInstalledThemeVersion(site.id);
  const themeVersionId = previewThemeVersionId || installed?.published || null;
  if (!themeVersionId) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{site.name}</h1>
        <p>No theme published yet.</p>
      </main>
    );
  }

  const mod = await loadThemeModule(themeVersionId);
  const Layout = mod?.default || null;
  const pathname = `/products/${handle}`;
  const match =
    mod?.manifest && mod?.templates ? resolveTemplateMatchForPath({ manifest: mod.manifest, templates: mod.templates, pathname }) : null;
  const Template = match?.Template || null;

  const settings = await resolveThemeSettings(site.id);
  const selectedSettings = previewThemeVersionId ? settings?.draft?.settings : settings?.published?.settings;
  const layouts = match?.templateId ? await resolveThemeLayout(site.id, match.templateId) : null;
  const selectedLayout = previewThemeVersionId ? layouts?.draft?.layout : layouts?.published?.layout;
  const commerce = createApiCommerceAdapter(site.id);

  if (Layout && Template) {
    return (
      <main>
        <Layout sdk={{ settings: selectedSettings || {}, commerce }}>
          <Template layout={selectedLayout || null} handle={handle} />
        </Layout>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>{site.name}</h1>
      <p>Theme could not resolve a product template for: {pathname}</p>
    </main>
  );
}

