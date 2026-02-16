/**
 * File: apps/storefront/src/lib/tenant.ts
 * Module: storefront
 * Purpose: Resolve tenant (site) and page content for SSR multi-tenant routing
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Temporary resolver uses existing Sites/Pages endpoints until Domains+Themes modules land
 * - Keep logs verbose for easier debugging during early development
 */

import type { PageContentV1 } from '@web-builder/contracts';
import { randomUUID } from 'crypto';

export interface SiteDto {
  id: string;
  name: string;
  domain?: string | null;
}

export interface PageDto {
  id: string;
  title: string;
  slug: string;
  // API returns `content` as the stored JSON root (PageNode)
  content?: any;
  siteId: string;
}

export interface ThemeInstallDto {
  siteId: string;
  themeId: string;
  draftThemeVersionId?: string | null;
  publishedThemeVersionId?: string | null;
}

export interface ExtensionInstallDto {
  id: string;
  siteId: string;
  extensionId: string;
  extensionVersionId: string;
  enabled: boolean;
}

function apiBase() {
  return process.env.API_BASE_URL || 'http://localhost:3000/api';
}

function requestHeaders(requestId?: string | null, siteId?: string | null) {
  const apiKey = process.env.API_AUTH_KEY;
  const actorId = process.env.API_ACTOR_ID;
  const authToken = process.env.API_AUTH_TOKEN;
  return {
    ...(requestId ? { 'x-request-id': requestId } : {}),
    ...(siteId ? { 'x-site-id': siteId } : {}),
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(actorId ? { 'x-actor-id': actorId } : {}),
    ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
  };
}

function ensureRequestId(requestId?: string | null) {
  return requestId && requestId.trim() ? requestId : randomUUID();
}

export async function resolveSiteByHost(host: string, requestId?: string | null): Promise<SiteDto | null> {
  try {
    const rid = ensureRequestId(requestId);
    console.debug('[storefront] resolveSiteByHost', { host, requestId: rid });
    const normalizedHost = host.split(':')[0].toLowerCase();

    // Primary (enterprise): resolve via DomainMapping
    const resolveRes = await fetch(`${apiBase()}/domains/resolve?host=${encodeURIComponent(normalizedHost)}`, {
      cache: 'no-store',
      headers: requestHeaders(rid),
    });
    if (resolveRes.ok) {
      const resolved: { siteId: string } = await resolveRes.json();
      const siteRes = await fetch(`${apiBase()}/sites/${resolved.siteId}`, {
        cache: 'no-store',
        headers: requestHeaders(rid, resolved.siteId),
      });
      if (siteRes.ok) return (await siteRes.json()) as SiteDto;
      console.error('[storefront] site get failed after domain resolve', { siteId: resolved.siteId, status: siteRes.status });
    }

    // Fallback (dev): match on Site.domain or use first site
    const res = await fetch(`${apiBase()}/sites`, { cache: 'no-store', headers: requestHeaders(rid) });
    if (!res.ok) {
      console.error('[storefront] sites list failed', { status: res.status });
      return null;
    }
    const sites: SiteDto[] = await res.json();
    const match = sites.find((s) => (s.domain || '').toLowerCase() === normalizedHost);
    return match || sites[0] || null;
  } catch (e) {
    console.error('[storefront] resolveSiteByHost error', e);
    return null;
  }
}

export async function resolvePageContentBySlug(siteId: string, slug: string, requestId?: string | null): Promise<PageContentV1 | null> {
  try {
    const rid = ensureRequestId(requestId);
    console.debug('[storefront] resolvePageContentBySlug', { siteId, slug, requestId: rid });
    const pagesRes = await fetch(`${apiBase()}/sites/${siteId}/pages`, {
      cache: 'no-store',
      headers: requestHeaders(rid, siteId),
    });
    if (!pagesRes.ok) {
      console.error('[storefront] pages list failed', { status: pagesRes.status, siteId });
      return null;
    }
    const pages: PageDto[] = await pagesRes.json();
    const match = pages.find((p) => p.slug === slug) || pages[0];
    if (!match) return null;

    const pageRes = await fetch(`${apiBase()}/sites/pages/${match.id}?mode=published`, {
      cache: 'no-store',
      headers: requestHeaders(rid, siteId),
    });
    if (!pageRes.ok) {
      console.error('[storefront] page get failed', { status: pageRes.status, pageId: match.id });
      return null;
    }
    const page: PageDto = await pageRes.json();
    if (!page?.content) return null;

    // API stores root node; wrap into PageContentV1
    return { schemaVersion: 1, root: page.content };
  } catch (e) {
    console.error('[storefront] resolvePageContentBySlug error', e);
    return null;
  }
}

export async function resolveInstalledThemeVersion(
  siteId: string,
  requestId?: string | null,
): Promise<{ published?: string | null; draft?: string | null } | null> {
  try {
    const rid = ensureRequestId(requestId);
    const res = await fetch(`${apiBase()}/sites/${siteId}/theme`, {
      cache: 'no-store',
      headers: requestHeaders(rid, siteId),
    });
    if (!res.ok) return null;
    const install: ThemeInstallDto = await res.json();
    return { published: install.publishedThemeVersionId ?? null, draft: install.draftThemeVersionId ?? null };
  } catch (e) {
    console.error('[storefront] resolveInstalledThemeVersion error', e);
    return null;
  }
}

export async function resolveThemeSettings(siteId: string, requestId?: string | null): Promise<{
  draft: { themeVersionId: string | null; settings: Record<string, unknown> };
  published: { themeVersionId: string | null; settings: Record<string, unknown> };
} | null> {
  try {
    const rid = ensureRequestId(requestId);
    const res = await fetch(`${apiBase()}/sites/${siteId}/theme/settings`, {
      cache: 'no-store',
      headers: requestHeaders(rid, siteId),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return {
      draft: {
        themeVersionId: typeof data?.draft?.themeVersionId === 'string' ? data.draft.themeVersionId : null,
        settings: (data?.draft?.settings && typeof data.draft.settings === 'object' ? data.draft.settings : {}) as Record<string, unknown>,
      },
      published: {
        themeVersionId: typeof data?.published?.themeVersionId === 'string' ? data.published.themeVersionId : null,
        settings:
          (data?.published?.settings && typeof data.published.settings === 'object' ? data.published.settings : {}) as Record<string, unknown>,
      },
    };
  } catch (e) {
    console.error('[storefront] resolveThemeSettings error', e);
    return null;
  }
}

export async function resolveThemeLayout(siteId: string, templateId: string, requestId?: string | null): Promise<{
  draft: { themeVersionId: string | null; layout: Record<string, unknown> };
  published: { themeVersionId: string | null; layout: Record<string, unknown> };
} | null> {
  try {
    const rid = ensureRequestId(requestId);
    const res = await fetch(
      `${apiBase()}/sites/${encodeURIComponent(siteId)}/theme/layouts?templateId=${encodeURIComponent(templateId)}`,
      { cache: 'no-store', headers: requestHeaders(rid, siteId) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return {
      draft: {
        themeVersionId: typeof data?.draft?.themeVersionId === 'string' ? data.draft.themeVersionId : null,
        layout: (data?.draft?.layout && typeof data.draft.layout === 'object' ? data.draft.layout : {}) as Record<string, unknown>,
      },
      published: {
        themeVersionId: typeof data?.published?.themeVersionId === 'string' ? data.published.themeVersionId : null,
        layout: (data?.published?.layout && typeof data.published.layout === 'object' ? data.published.layout : {}) as Record<string, unknown>,
      },
    };
  } catch (e) {
    console.error('[storefront] resolveThemeLayout error', e);
    return null;
  }
}

export async function resolveInstalledExtensions(siteId: string, requestId?: string | null): Promise<ExtensionInstallDto[]> {
  try {
    const rid = ensureRequestId(requestId);
    const res = await fetch(`${apiBase()}/sites/${encodeURIComponent(siteId)}/extensions`, {
      cache: 'no-store',
      headers: requestHeaders(rid, siteId),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return Array.isArray(data) ? (data as ExtensionInstallDto[]) : [];
  } catch (e) {
    console.error('[storefront] resolveInstalledExtensions error', e);
    return [];
  }
}


