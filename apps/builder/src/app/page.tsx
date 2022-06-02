/**
 * File: apps/builder/src/app/page.tsx
 * Module: builder-dashboard
 * Purpose: Seller dashboard for site/page navigation and quick editor entry
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 * Notes:
 * - This replaces the default Nx starter page with a product-focused dashboard.
 * - Data is loaded from existing Sites and Pages APIs.
 */
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type SiteDto = {
  id: string;
  name: string;
  domain?: string | null;
};

type PageDto = {
  id: string;
  title: string;
  slug: string;
  isPublished?: boolean;
};

type PageDraft = {
  title: string;
  slug: string;
};

const defaultDraft: PageDraft = {
  title: 'Home',
  slug: 'home',
};

export default function BuilderDashboardPage() {
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [pagesBySite, setPagesBySite] = useState<Record<string, PageDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [siteName, setSiteName] = useState('');
  const [siteDomain, setSiteDomain] = useState('');
  const [pageDraftBySite, setPageDraftBySite] = useState<Record<string, PageDraft>>({});

  const totalPages = useMemo(
    () => Object.values(pagesBySite).reduce((sum, rows) => sum + rows.length, 0),
    [pagesBySite],
  );

  const loadSitesAndPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSites = await apiGet<SiteDto[]>('/api/sites');
      setSites(nextSites);

      const nextPagesBySite: Record<string, PageDto[]> = {};
      await Promise.all(
        nextSites.map(async (site) => {
          try {
            const rows = await apiGet<PageDto[]>(
              `/api/sites/${encodeURIComponent(site.id)}/pages`,
            );
            nextPagesBySite[site.id] = rows;
          } catch {
            nextPagesBySite[site.id] = [];
          }
        }),
      );
      setPagesBySite(nextPagesBySite);
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSitesAndPages();
  }, []);

  const createSite = async () => {
    if (!siteName.trim()) {
      alert('Site name is required');
      return;
    }

    setBusy(true);
    try {
      await apiPost('/api/sites', {
        name: siteName.trim(),
        domain: siteDomain.trim() || undefined,
      });
      setSiteName('');
      setSiteDomain('');
      await loadSitesAndPages();
    } catch (e: any) {
      alert(e?.message || 'Failed to create site');
    } finally {
      setBusy(false);
    }
  };

  const createPage = async (siteId: string) => {
    const draft = pageDraftBySite[siteId] || defaultDraft;
    if (!draft.title.trim()) {
      alert('Page title is required');
      return;
    }
    if (!draft.slug.trim()) {
      alert('Page slug is required');
      return;
    }

    setBusy(true);
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/pages`, {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
      });
      setPageDraftBySite((prev) => ({ ...prev, [siteId]: defaultDraft }));
      await loadSitesAndPages();
    } catch (e: any) {
      alert(e?.message || 'Failed to create page');
    } finally {
      setBusy(false);
    }
  };

  const updatePageDraft = (
    siteId: string,
    key: keyof PageDraft,
    value: string,
  ) => {
    setPageDraftBySite((prev) => ({
      ...prev,
      [siteId]: { ...(prev[siteId] || defaultDraft), [key]: value },
    }));
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">WebBuilder Studio</h1>
            <p className="text-sm text-slate-600 mt-1">
              Build pages, preview instantly, and publish with confidence.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link className="px-3 py-2 rounded border bg-white text-sm" href="/themes">
              Themes
            </Link>
            <Link className="px-3 py-2 rounded border bg-white text-sm" href="/extensions">
              Extensions
            </Link>
            <button
              className="px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
              onClick={() => void loadSitesAndPages()}
              disabled={loading || busy}
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border rounded-xl p-4">
            <h2 className="font-semibold text-slate-900">Create Site</h2>
            <p className="text-xs text-slate-600 mt-1">
              Start a new project and add pages in seconds.
            </p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Site name (required)"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Domain (optional)"
                value={siteDomain}
                onChange={(e) => setSiteDomain(e.target.value)}
              />
              <button
                className="w-full px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={createSite}
                disabled={busy}
              >
                Create Site
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Projects</h2>
              <div className="text-xs text-slate-500">
                {sites.length} site(s) · {totalPages} page(s)
              </div>
            </div>

            {loading ? <div className="mt-4 text-sm text-slate-600">Loading projects...</div> : null}
            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

            {!loading && !sites.length ? (
              <div className="mt-4 text-sm text-slate-600">
                No sites yet. Create your first site from the panel.
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {sites.map((site) => {
                const pages = pagesBySite[site.id] || [];
                const pageDraft = pageDraftBySite[site.id] || defaultDraft;

                return (
                  <section key={site.id} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{site.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          siteId: <span className="font-mono">{site.id}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          domain: {site.domain || 'not set'}
                        </div>
                      </div>
                      <Link
                        className="px-3 py-2 rounded border bg-white text-xs"
                        href={`/sites/${encodeURIComponent(site.id)}/publish`}
                      >
                        Publish Center
                      </Link>
                    </div>

                    <div className="mt-4 p-3 rounded bg-white border">
                      <div className="text-xs font-semibold text-slate-700">Add Page</div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input
                          className="md:col-span-2 border rounded px-2 py-2 text-sm"
                          placeholder="Title"
                          value={pageDraft.title}
                          onChange={(e) =>
                            updatePageDraft(site.id, 'title', e.target.value)
                          }
                        />
                        <input
                          className="md:col-span-2 border rounded px-2 py-2 text-sm"
                          placeholder="Slug"
                          value={pageDraft.slug}
                          onChange={(e) =>
                            updatePageDraft(site.id, 'slug', e.target.value)
                          }
                        />
                        <button
                          className="md:col-span-1 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                          onClick={() => void createPage(site.id)}
                          disabled={busy}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {pages.map((page) => (
                        <div
                          key={page.id}
                          className="flex flex-wrap items-center justify-between gap-2 border rounded px-3 py-2 bg-white"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {page.title}
                            </div>
                            <div className="text-xs text-slate-600">
                              /{page.slug} · pageId:{' '}
                              <span className="font-mono">{page.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] px-2 py-1 rounded ${
                                page.isPublished
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {page.isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            <Link
                              className="px-2 py-1 rounded border text-xs bg-white"
                              href={`/editor/${encodeURIComponent(page.id)}`}
                            >
                              Edit
                            </Link>
                            <Link
                              className="px-2 py-1 rounded border text-xs bg-white"
                              href={`/preview/${encodeURIComponent(page.id)}`}
                            >
                              Preview
                            </Link>
                          </div>
                        </div>
                      ))}
                      {!pages.length ? (
                        <div className="text-xs text-slate-500">
                          No pages yet for this site.
                        </div>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
