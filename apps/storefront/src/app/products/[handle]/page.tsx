/**
 * File: apps/storefront/src/app/products/[handle]/page.tsx
 * Module: storefront
 * Purpose: Product detail route resolved via theme manifest routing (SSR)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { headers } from 'next/headers';
import { resolveInstalledExtensions, resolveInstalledThemeVersion, resolveSiteByHost, resolveThemeLayout, resolveThemeSettings } from '../../../lib/tenant';
import { loadThemeModule } from '../../../lib/theme-runtime';
import { resolveTemplateMatchForPath } from '../../../lib/theme-routing';
import { createApiCommerceAdapter } from '../../../lib/commerce-adapter';
import { randomUUID } from 'crypto';
import { loadExtensionModule } from '../../../lib/extension-runtime';
import { StorefrontFallbackShell } from '../../../components/storefront-fallback-shell';

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
      />
    );
  }

  const sp = (await searchParams) || {};
  const previewThemeVersionId = typeof sp.previewThemeVersionId === 'string' ? sp.previewThemeVersionId : null;

  const installed = await resolveInstalledThemeVersion(site.id, requestId);
  const themeVersionId = previewThemeVersionId || installed?.published || null;
  if (!themeVersionId) {
    return (
      <StorefrontFallbackShell
        badge="Theme missing"
        title={`${site.name}: no published theme yet`}
        description="Product routes require a published theme with product template mapping."
        details={[
          { label: 'Site ID', value: site.id },
          { label: 'Product handle', value: handle },
          { label: 'Request ID', value: requestId },
        ]}
        actions={[{ label: 'Open storefront home', href: '/' }]}
        hints={[
          'Publish a theme version from Builder.',
          'Ensure manifest.routes includes products route mapping.',
        ]}
      />
    );
  }

  const mod = await loadThemeModule(themeVersionId);
  const Layout = mod?.default || null;
  const pathname = `/products/${handle}`;
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
          <Template layout={selectedLayout || null} handle={handle} />
        </Layout>
      </main>
    );
  }

  return (
    <StorefrontFallbackShell
      badge="Template missing"
      title={`${site.name}: product template not resolved`}
      description="The current theme does not expose a template for this product route."
      details={[
        { label: 'Route', value: pathname },
        { label: 'Theme version', value: themeVersionId },
        { label: 'Request ID', value: requestId },
      ]}
      actions={[{ label: 'Back to storefront home', href: '/' }]}
      hints={[
        'Add route mapping for products path in manifest.routes.',
        'Rebuild and republish theme after template changes.',
      ]}
    />
  );
}

