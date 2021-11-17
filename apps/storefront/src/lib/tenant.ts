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

function apiBase() {
  return process.env.API_BASE_URL || 'http://localhost:3000/api';
}

export async function resolveSiteByHost(host: string): Promise<SiteDto | null> {
  try {
    console.debug('[storefront] resolveSiteByHost', { host });
    const res = await fetch(`${apiBase()}/sites`, { cache: 'no-store' });
    if (!res.ok) {
      console.error('[storefront] sites list failed', { status: res.status });
      return null;
    }
    const sites: SiteDto[] = await res.json();
    const normalizedHost = host.split(':')[0].toLowerCase();
    const match = sites.find((s) => (s.domain || '').toLowerCase() === normalizedHost);
    return match || sites[0] || null;
  } catch (e) {
    console.error('[storefront] resolveSiteByHost error', e);
    return null;
  }
}

export async function resolvePageContentBySlug(siteId: string, slug: string): Promise<PageContentV1 | null> {
  try {
    console.debug('[storefront] resolvePageContentBySlug', { siteId, slug });
    const pagesRes = await fetch(`${apiBase()}/sites/${siteId}/pages`, { cache: 'no-store' });
    if (!pagesRes.ok) {
      console.error('[storefront] pages list failed', { status: pagesRes.status, siteId });
      return null;
    }
    const pages: PageDto[] = await pagesRes.json();
    const match = pages.find((p) => p.slug === slug) || pages[0];
    if (!match) return null;

    const pageRes = await fetch(`${apiBase()}/sites/pages/${match.id}`, { cache: 'no-store' });
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


