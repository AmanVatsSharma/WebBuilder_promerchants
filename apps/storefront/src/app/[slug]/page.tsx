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
import { resolveInstalledExtensions, resolveInstalledThemeVersion, resolvePageContentBySlug, resolveSiteByHost, resolveThemeLayout, resolveThemeSettings } from '../../lib/tenant';
import { loadThemeModule } from '../../lib/theme-runtime';
import { resolveTemplateMatchForPath } from '../../lib/theme-routing';
import { createApiCommerceAdapter } from '../../lib/commerce-adapter';
import { randomUUID } from 'crypto';
import { loadExtensionModule } from '../../lib/extension-runtime';
import { StorefrontFallbackShell } from '../../components/storefront-fallback-shell';

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
  const requestId = h.get('x-request-id') || randomUUID();

  const site = await resolveSiteByHost(host, requestId);
  if (!site) {
    return (
      <StorefrontFallbackShell
        badge="Tenant missing"
        title="Storefront tenant could not be resolved"
        description="This host is not connected to an active storefront tenant."
        details={[
          { label: 'Host', value: host },
          { label: 'Request ID', value: requestId },
        ]}
        actions={[{ label: 'Open storefront root', href: '/' }]}
        hints={[
          'Confirm domain mapping in Builder dashboard.',
          'Ensure DNS points to storefront deployment.',
        ]}
      />
    );
  }

  const sp = (await searchParams) || {};
  const previewThemeVersionId = typeof sp.previewThemeVersionId === 'string' ? sp.previewThemeVersionId : null;

  // Published only, unless previewThemeVersionId is explicitly provided (builder preview mode)
  const installed = await resolveInstalledThemeVersion(site.id, requestId);
  const themeVersionId = previewThemeVersionId || installed?.published || null;
  if (themeVersionId) {
    const mod = await loadThemeModule(themeVersionId);
    const Layout = mod?.default || null;
    const pathname = `/${slug}`;
    const match =
      mod?.manifest && mod?.templates ? resolveTemplateMatchForPath({ manifest: mod.manifest, templates: mod.templates, pathname }) : null;
    const Template = match?.Template || null;
    const settings = await resolveThemeSettings(site.id, requestId);
    const selectedSettings = previewThemeVersionId ? settings?.draft?.settings : settings?.published?.settings;
    const layouts = match?.templateId ? await resolveThemeLayout(site.id, match.templateId, requestId) : null;
    const selectedLayout = previewThemeVersionId ? layouts?.draft?.layout : layouts?.published?.layout;
    const commerce = createApiCommerceAdapter(site.id);

    const extInstalls = await resolveInstalledExtensions(site.id, requestId);
    const extMods = await Promise.all(extInstalls.map((i) => loadExtensionModule(i.extensionVersionId)));
    const extBlocks = extMods.reduce<Record<string, any>>((acc, m) => {
      const blocks = (m as any)?.blocks;
      if (blocks && typeof blocks === 'object') Object.assign(acc, blocks);
      return acc;
    }, {});

    if (Layout && Template) {
      return (
        <main>
          <Layout sdk={{ settings: selectedSettings || {}, commerce, extensions: { blocks: extBlocks } }}>
            <Template layout={selectedLayout || null} />
          </Layout>
        </main>
      );
    }

    if (Layout) {
      return (
        <main>
          <Layout sdk={{ settings: selectedSettings || {}, commerce, extensions: { blocks: extBlocks } }} />
        </main>
      );
    }
  }

  const content = await resolvePageContentBySlug(site.id, slug, requestId);
  if (!content) {
    return (
      <StorefrontFallbackShell
        badge="Page missing"
        title={`${site.name}: page not found`}
        description={`The route "/${slug}" is not mapped to published page content or theme template.`}
        details={[
          { label: 'Host', value: host },
          { label: 'Site ID', value: site.id },
          { label: 'Request ID', value: requestId },
        ]}
        actions={[{ label: 'Back to storefront home', href: '/' }]}
        hints={[
          'Create the missing page in Builder and publish.',
          'Or add a matching theme route template.',
        ]}
      />
    );
  }

  return (
    <main>
      <PageRenderer content={content} />
    </main>
  );
}


