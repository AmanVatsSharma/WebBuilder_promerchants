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
import { resolveInstalledExtensions, resolveInstalledThemeVersion, resolvePageContentBySlug, resolveSiteByHost, resolveThemeLayout, resolveThemeSettings } from '../lib/tenant';
import { loadThemeModule } from '../lib/theme-runtime';
import { resolveTemplateMatchForPath } from '../lib/theme-routing';
import { createApiCommerceAdapter } from '../lib/commerce-adapter';
import { randomUUID } from 'crypto';
import { loadExtensionModule } from '../lib/extension-runtime';
import { StorefrontFallbackShell } from '../components/storefront-fallback-shell';

registerCoreComponents();

export default async function Home({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const h = await headers();
  const host = h.get('x-tenant-host') || h.get('host') || 'unknown';
  const requestId = h.get('x-request-id') || randomUUID();

  const site = await resolveSiteByHost(host, requestId);
  if (!site) {
    return (
      <StorefrontFallbackShell
        badge="Tenant missing"
        title="Storefront tenant could not be resolved"
        description="This host is not mapped to a published storefront yet. Connect and verify a domain from Builder to activate this route."
        details={[
          { label: 'Host', value: host },
          { label: 'Request ID', value: requestId },
        ]}
        actions={[{ label: 'Open root storefront route', href: '/' }]}
        hints={[
          'Create or verify domain mapping from Builder dashboard.',
          'Ensure the host is pointing to the storefront deployment.',
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
    const match =
      mod?.manifest && mod?.templates ? resolveTemplateMatchForPath({ manifest: mod.manifest, templates: mod.templates, pathname: '/' }) : null;
    const Template = match?.Template || null;
    const settings = await resolveThemeSettings(site.id, requestId);
    const selectedSettings = previewThemeVersionId ? settings?.draft?.settings : settings?.published?.settings;
    const layouts = match?.templateId ? await resolveThemeLayout(site.id, match.templateId, requestId) : null;
    const selectedLayout = previewThemeVersionId ? layouts?.draft?.layout : layouts?.published?.layout;
    const commerce = createApiCommerceAdapter(site.id);

    // Load installed extension blocks (app blocks) and pass to ThemeSdkProvider via sdk.extensions.blocks
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

  if (installed?.published && !themeVersionId) {
    return (
      <StorefrontFallbackShell
        badge="Theme load issue"
        title={`${site.name}: published theme could not be loaded`}
        description="A theme version is marked as published, but runtime loading failed. Rebuild or republish the theme from Builder."
        details={[
          { label: 'Published theme version', value: installed.published },
          { label: 'Site ID', value: site.id },
          { label: 'Request ID', value: requestId },
        ]}
        actions={[{ label: 'Open homepage route', href: '/' }]}
        hints={[
          'Open Theme Studio and run a fresh build.',
          'Republish the theme version from Publish Center.',
        ]}
      />
    );
  }

  const content = await resolvePageContentBySlug(site.id, 'home', requestId);
  if (!content) {
    return (
      <StorefrontFallbackShell
        badge="No homepage content"
        title={`${site.name}: no homepage configured yet`}
        description="This storefront is connected, but no page content is published for the home route."
        details={[
          { label: 'Host', value: host },
          { label: 'Site ID', value: site.id },
          { label: 'Request ID', value: requestId },
        ]}
        actions={[{ label: 'Reload storefront', href: '/' }]}
        hints={[
          'Create a home page in Builder and publish it.',
          'Or publish a theme template for the root route.',
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
