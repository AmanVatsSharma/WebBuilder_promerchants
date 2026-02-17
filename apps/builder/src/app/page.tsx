/**
 * File: apps/builder/src/app/page.tsx
 * Module: builder-dashboard
 * Purpose: Premium dashboard UX for site/page/domain operations and ops visibility
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { InlineNotice, type NoticeTone } from '../components/inline-notice';

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

type DomainMappingDto = {
  id: string;
  host: string;
  siteId: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  lastError?: string | null;
};

type DomainChallengeMetricsDto = {
  generatedAt: string;
  totalChallenges: number;
  issuedCount: number;
  verifiedCount: number;
  failedCount: number;
  pendingPropagationCount: number;
  propagatingCount: number;
  readyPropagationCount: number;
  failedPropagationCount: number;
  dueRetryCount: number;
  exhaustedCount: number;
  averageAttempts: number;
  verificationSuccessRate: number;
  alertCount: number;
  alertsLast24h: number;
  undeliveredAlerts: number;
};

type DomainChallengeAlertDto = {
  id: string;
  challengeId: string;
  mappingId: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  eventType: string;
  message: string;
  delivered: boolean;
  createdAt: string;
};

type ThemeInstallDto = {
  siteId: string;
  themeId: string;
  draftThemeVersionId?: string | null;
  publishedThemeVersionId?: string | null;
};

type ThemeVersionSummaryDto = {
  id: string;
  version?: string;
  status: string;
};

type ThemeAuditDto = {
  id: string;
  action: 'PUBLISH' | 'ROLLBACK';
  actor: string;
  fromThemeVersionId?: string | null;
  toThemeVersionId: string;
  createdAt: string;
};

type PageDraft = {
  title: string;
  slug: string;
};

type NoticeState = { tone: NoticeTone; message: string } | null;
type ShortcutAction = 'editor' | 'storefront' | 'publish';
type ShortcutStats = { editorClicks: number; storefrontClicks: number; publishClicks: number };

const defaultDraft: PageDraft = { title: 'Home', slug: 'home' };
const storefrontBase = (process.env.NEXT_PUBLIC_STOREFRONT_URL as string) || 'http://localhost:4201';
const shortcutsStorageKey = 'builder.dashboard.shortcutStats.v1';

function inferProtocol(host: string) {
  const normalized = String(host || '').trim().toLowerCase();
  if (!normalized) return 'http';
  if (normalized.includes('localhost') || normalized.startsWith('127.') || normalized.startsWith('0.0.0.0')) {
    return 'http';
  }
  return 'https';
}

function toSlugPath(page?: PageDto | null) {
  if (!page?.slug) return '/';
  return page.slug === 'home' ? '/' : `/${page.slug}`;
}

function storefrontUrlForSite(site: SiteDto, domains: DomainMappingDto[], page?: PageDto | null) {
  const verifiedDomain = domains.find((item) => item.status === 'VERIFIED')?.host;
  const candidateDomain = verifiedDomain || site.domain || '';
  const path = toSlugPath(page);
  if (candidateDomain) {
    const protocol = inferProtocol(candidateDomain);
    return `${protocol}://${candidateDomain}${path}`;
  }
  return `${storefrontBase}${path}`;
}

function themeStatusChipClass(status?: string | null) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'BUILT') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'FAILED') return 'bg-rose-100 text-rose-700';
  if (normalized === 'BUILDING' || normalized === 'QUEUED') return 'bg-amber-100 text-amber-700';
  if (normalized === 'PUBLISHED') return 'bg-indigo-100 text-indigo-700';
  if (normalized === 'DRAFT') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-200 text-slate-700';
}

function emptyShortcutStats(): ShortcutStats {
  return { editorClicks: 0, storefrontClicks: 0, publishClicks: 0 };
}

export default function BuilderDashboardPage() {
  const [sites, setSites] = useState<SiteDto[]>([]);
  const [pagesBySite, setPagesBySite] = useState<Record<string, PageDto[]>>({});
  const [domainsBySite, setDomainsBySite] = useState<Record<string, DomainMappingDto[]>>({});
  const [themeInstallBySite, setThemeInstallBySite] = useState<Record<string, ThemeInstallDto | null>>({});
  const [latestThemeAuditBySite, setLatestThemeAuditBySite] = useState<Record<string, ThemeAuditDto | null>>({});
  const [themeVersionBySite, setThemeVersionBySite] = useState<
    Record<string, { draft: ThemeVersionSummaryDto | null; published: ThemeVersionSummaryDto | null }>
  >({});
  const [challengeMetrics, setChallengeMetrics] = useState<DomainChallengeMetricsDto | null>(null);
  const [challengeAlerts, setChallengeAlerts] = useState<DomainChallengeAlertDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const [siteName, setSiteName] = useState('');
  const [siteDomain, setSiteDomain] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [pageDraftBySite, setPageDraftBySite] = useState<Record<string, PageDraft>>({});
  const [domainDraftBySite, setDomainDraftBySite] = useState<Record<string, string>>({});
  const [shortcutStatsBySite, setShortcutStatsBySite] = useState<Record<string, ShortcutStats>>({});

  const totalPages = useMemo(
    () => Object.values(pagesBySite).reduce((sum, rows) => sum + rows.length, 0),
    [pagesBySite],
  );
  const totalDomains = useMemo(
    () => Object.values(domainsBySite).reduce((sum, rows) => sum + rows.length, 0),
    [domainsBySite],
  );
  const verifiedDomains = useMemo(
    () =>
      Object.values(domainsBySite)
        .flat()
        .filter((item) => item.status === 'VERIFIED').length,
    [domainsBySite],
  );

  const filteredSites = useMemo(() => {
    const query = siteFilter.trim().toLowerCase();
    if (!query) return sites;
    return sites.filter((site) =>
      [site.name, site.id, site.domain || '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [sites, siteFilter]);

  const shortcutTotals = useMemo(() => {
    return Object.values(shortcutStatsBySite).reduce(
      (acc, current) => ({
        editorClicks: acc.editorClicks + Number(current.editorClicks || 0),
        storefrontClicks: acc.storefrontClicks + Number(current.storefrontClicks || 0),
        publishClicks: acc.publishClicks + Number(current.publishClicks || 0),
      }),
      emptyShortcutStats(),
    );
  }, [shortcutStatsBySite]);

  const loadShortcutStats = () => {
    try {
      const raw = window.sessionStorage.getItem(shortcutsStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, ShortcutStats>;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed;
    } catch {
      return {};
    }
  };

  const persistShortcutStats = (next: Record<string, ShortcutStats>) => {
    try {
      window.sessionStorage.setItem(shortcutsStorageKey, JSON.stringify(next));
    } catch {
      // no-op fallback for restricted browser storage environments
    }
  };

  const trackShortcutAction = (siteId: string, action: ShortcutAction) => {
    setShortcutStatsBySite((prev) => {
      const current = prev[siteId] || emptyShortcutStats();
      const updated: ShortcutStats = {
        editorClicks: current.editorClicks + (action === 'editor' ? 1 : 0),
        storefrontClicks: current.storefrontClicks + (action === 'storefront' ? 1 : 0),
        publishClicks: current.publishClicks + (action === 'publish' ? 1 : 0),
      };
      const next = { ...prev, [siteId]: updated };
      persistShortcutStats(next);
      return next;
    });
  };

  const resetShortcutStats = () => {
    setShortcutStatsBySite(() => {
      const next = Object.fromEntries(
        sites.map((site) => [site.id, emptyShortcutStats()]),
      ) as Record<string, ShortcutStats>;
      persistShortcutStats(next);
      return next;
    });
    setNotice({ tone: 'success', message: 'Shortcut analytics reset for this browser session.' });
  };

  const exportShortcutStats = async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      totals: shortcutTotals,
      bySite: shortcutStatsBySite,
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setNotice({ tone: 'success', message: 'Shortcut analytics copied to clipboard.' });
        return;
      }
    } catch {
      // fallback to file download below
    }

    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `builder-shortcut-analytics-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: 'success', message: 'Shortcut analytics exported as JSON file.' });
    } catch (error: any) {
      setNotice({ tone: 'error', message: error?.message || 'Failed to export shortcut analytics.' });
    }
  };

  const loadOpsSnapshot = async () => {
    setOpsLoading(true);
    setOpsError(null);
    try {
      const [metrics, alerts] = await Promise.all([
        apiGet<DomainChallengeMetricsDto>('/api/domains/challenges/metrics'),
        apiGet<DomainChallengeAlertDto[]>('/api/domains/challenges/alerts?limit=5'),
      ]);
      setChallengeMetrics(metrics);
      setChallengeAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (e: any) {
      console.error('[builder-dashboard] loadOpsSnapshot:failed', { reason: e?.message || e });
      setChallengeMetrics(null);
      setChallengeAlerts([]);
      setOpsError('Domain challenge operations snapshot unavailable.');
    } finally {
      setOpsLoading(false);
    }
  };

  const loadSitesAndPages = async () => {
    console.debug('[builder-dashboard] loadSitesAndPages:start');
    setLoading(true);
    setError(null);
    try {
      const nextSites = await apiGet<SiteDto[]>('/api/sites');
      setSites(nextSites);

      const nextPagesBySite: Record<string, PageDto[]> = {};
      const nextThemeInstallBySite: Record<string, ThemeInstallDto | null> = {};
      const nextLatestThemeAuditBySite: Record<string, ThemeAuditDto | null> = {};
      const nextThemeVersionBySite: Record<
        string,
        { draft: ThemeVersionSummaryDto | null; published: ThemeVersionSummaryDto | null }
      > = {};
      const versionSummaryCache = new Map<string, Promise<ThemeVersionSummaryDto | null>>();
      const getThemeVersionSummary = async (themeVersionId?: string | null) => {
        const id = String(themeVersionId || '').trim();
        if (!id) return null;
        const existing = versionSummaryCache.get(id);
        if (existing) return existing;
        const request = apiGet<ThemeVersionSummaryDto>(`/api/themes/versions/${encodeURIComponent(id)}`)
          .then((response) => ({
            id: response.id || id,
            version: response.version || id,
            status: response.status || 'UNKNOWN',
          }))
          .catch(() => null);
        versionSummaryCache.set(id, request);
        return request;
      };
      await Promise.all(
        nextSites.map(async (site) => {
          const [pagesResult, installResult, auditsResult] = await Promise.all([
            apiGet<PageDto[]>(`/api/sites/${encodeURIComponent(site.id)}/pages`).catch(() => []),
            apiGet<ThemeInstallDto>(`/api/sites/${encodeURIComponent(site.id)}/theme`).catch(() => null),
            apiGet<ThemeAuditDto[]>(`/api/sites/${encodeURIComponent(site.id)}/theme/audits`).catch(() => []),
          ]);
          const [draftThemeVersion, publishedThemeVersion] = await Promise.all([
            getThemeVersionSummary(installResult?.draftThemeVersionId),
            getThemeVersionSummary(installResult?.publishedThemeVersionId),
          ]);
          try {
            nextPagesBySite[site.id] = pagesResult;
            nextThemeInstallBySite[site.id] = installResult;
            nextLatestThemeAuditBySite[site.id] = auditsResult[0] || null;
            nextThemeVersionBySite[site.id] = {
              draft: draftThemeVersion,
              published: publishedThemeVersion,
            };
          } catch (error: any) {
            console.error('[builder-dashboard] site-data load failed', {
              siteId: site.id,
              reason: error?.message || error,
            });
            nextPagesBySite[site.id] = [];
            nextThemeInstallBySite[site.id] = null;
            nextLatestThemeAuditBySite[site.id] = null;
            nextThemeVersionBySite[site.id] = { draft: null, published: null };
          }
        }),
      );
      setPagesBySite(nextPagesBySite);
      setThemeInstallBySite(nextThemeInstallBySite);
      setLatestThemeAuditBySite(nextLatestThemeAuditBySite);
      setThemeVersionBySite(nextThemeVersionBySite);

      try {
        const mappings = await apiGet<DomainMappingDto[]>('/api/domains');
        const nextDomainsBySite = mappings.reduce<Record<string, DomainMappingDto[]>>(
          (acc, row) => {
            if (!acc[row.siteId]) acc[row.siteId] = [];
            acc[row.siteId].push(row);
            return acc;
          },
          {},
        );
        setDomainsBySite(nextDomainsBySite);
      } catch {
        setDomainsBySite({});
      }
      console.debug('[builder-dashboard] loadSitesAndPages:success', { sites: nextSites.length });
    } catch (e: any) {
      console.error('[builder-dashboard] loadSitesAndPages:failed', { reason: e?.message || e });
      setError(e?.message || 'Failed to load dashboard');
    } finally {
      await loadOpsSnapshot();
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSitesAndPages();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShortcutStatsBySite(loadShortcutStats());
  }, []);

  useEffect(() => {
    if (!sites.length) return;
    setShortcutStatsBySite((prev) => {
      const next = { ...prev };
      let touched = false;
      for (const site of sites) {
        if (!next[site.id]) {
          next[site.id] = emptyShortcutStats();
          touched = true;
        }
      }
      if (touched) persistShortcutStats(next);
      return touched ? next : prev;
    });
  }, [sites]);

  const createSite = async () => {
    if (!siteName.trim()) {
      setNotice({ tone: 'error', message: 'Site name is required.' });
      return;
    }
    setBusy(true);
    setNotice({ tone: 'info', message: 'Creating site...' });
    try {
      await apiPost('/api/sites', {
        name: siteName.trim(),
        domain: siteDomain.trim() || undefined,
      });
      setSiteName('');
      setSiteDomain('');
      setNotice({ tone: 'success', message: 'Site created successfully.' });
      await loadSitesAndPages();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Failed to create site.' });
    } finally {
      setBusy(false);
    }
  };

  const createPage = async (siteId: string) => {
    const draft = pageDraftBySite[siteId] || defaultDraft;
    if (!draft.title.trim() || !draft.slug.trim()) {
      setNotice({ tone: 'error', message: 'Page title and slug are required.' });
      return;
    }
    setBusy(true);
    setNotice({ tone: 'info', message: 'Creating page...' });
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/pages`, {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
      });
      setPageDraftBySite((prev) => ({ ...prev, [siteId]: defaultDraft }));
      setNotice({ tone: 'success', message: 'Page created successfully.' });
      await loadSitesAndPages();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Failed to create page.' });
    } finally {
      setBusy(false);
    }
  };

  const createDomain = async (siteId: string) => {
    const draftHost = (domainDraftBySite[siteId] || '').trim();
    if (!draftHost) {
      setNotice({ tone: 'error', message: 'Domain host is required.' });
      return;
    }
    setBusy(true);
    setNotice({ tone: 'info', message: 'Adding domain mapping...' });
    try {
      await apiPost('/api/domains', { host: draftHost, siteId });
      setDomainDraftBySite((prev) => ({ ...prev, [siteId]: '' }));
      setNotice({ tone: 'success', message: 'Domain mapping created successfully.' });
      await loadSitesAndPages();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Failed to add domain mapping.' });
    } finally {
      setBusy(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    setBusy(true);
    setNotice({ tone: 'info', message: 'Verifying domain...' });
    try {
      await apiPost(`/api/domains/${encodeURIComponent(domainId)}/verify`);
      setNotice({ tone: 'success', message: 'Domain verification completed.' });
      await loadSitesAndPages();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Failed to verify domain.' });
    } finally {
      setBusy(false);
    }
  };

  const updatePageDraft = (siteId: string, key: keyof PageDraft, value: string) => {
    setPageDraftBySite((prev) => ({
      ...prev,
      [siteId]: { ...(prev[siteId] || defaultDraft), [key]: value },
    }));
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">WebBuilder Studio</h1>
              <p className="mt-1 text-sm text-slate-200">
                Build pages, launch domains, and run operations with confidence.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20" href="/themes">
                Themes
              </Link>
              <Link className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20" href="/extensions">
                Extensions
              </Link>
              <button
                className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
                onClick={() => void loadSitesAndPages()}
                disabled={loading || busy}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              <div className="text-xs text-slate-300">Sites</div>
              <div className="text-xl font-semibold">{sites.length}</div>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              <div className="text-xs text-slate-300">Pages</div>
              <div className="text-xl font-semibold">{totalPages}</div>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              <div className="text-xs text-slate-300">Domains</div>
              <div className="text-xl font-semibold">{totalDomains}</div>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              <div className="text-xs text-slate-300">Verified</div>
              <div className="text-xl font-semibold">{verifiedDomains}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        {notice ? (
          <div className="mb-4">
            <InlineNotice
              tone={notice.tone}
              message={notice.message}
              onDismiss={() => setNotice(null)}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">Create Site</h2>
              <p className="mt-1 text-xs text-slate-600">Start a new project and add pages in seconds.</p>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Site name (required)"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                />
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Domain (optional)"
                  value={siteDomain}
                  onChange={(event) => setSiteDomain(event.target.value)}
                />
                <button
                  className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  onClick={createSite}
                  disabled={busy}
                >
                  Create Site
                </button>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Domain Ops Pulse</h2>
                <span className="text-[11px] text-slate-500">SLO snapshot</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Track domain challenge reliability before launch day.
              </p>
              {opsLoading ? <div className="mt-3 text-xs text-slate-500">Loading operations snapshot...</div> : null}
              {opsError ? <div className="mt-3 text-xs text-amber-700">{opsError}</div> : null}
              {challengeMetrics ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border bg-slate-50 px-2 py-2">
                    <div className="text-slate-500">Success rate</div>
                    <div className="font-semibold text-slate-900">
                      {(challengeMetrics.verificationSuccessRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded border bg-slate-50 px-2 py-2">
                    <div className="text-slate-500">Challenges</div>
                    <div className="font-semibold text-slate-900">{challengeMetrics.totalChallenges}</div>
                  </div>
                  <div className="rounded border bg-slate-50 px-2 py-2">
                    <div className="text-slate-500">Due retries</div>
                    <div className="font-semibold text-slate-900">{challengeMetrics.dueRetryCount}</div>
                  </div>
                  <div className="rounded border bg-slate-50 px-2 py-2">
                    <div className="text-slate-500">Undelivered alerts</div>
                    <div className="font-semibold text-slate-900">{challengeMetrics.undeliveredAlerts}</div>
                  </div>
                </div>
              ) : null}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-700">Recent challenge alerts</div>
                <div className="mt-2 space-y-2">
                  {challengeAlerts.map((alert) => (
                    <div key={alert.id} className="rounded border bg-slate-50 px-2 py-2 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{alert.severity}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            alert.delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {alert.delivered ? 'Delivered' : 'Pending delivery'}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-700">{alert.message}</div>
                      <div className="mt-1 text-slate-500">{new Date(alert.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                  {!opsLoading && !challengeAlerts.length ? (
                    <div className="text-[11px] text-slate-500">No recent challenge alerts.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Projects</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="rounded border px-3 py-2 text-xs"
                  placeholder="Search site/name/domain"
                  value={siteFilter}
                  onChange={(event) => setSiteFilter(event.target.value)}
                />
                <div className="text-xs text-slate-500">
                  {filteredSites.length}/{sites.length} site(s) · {totalPages} page(s)
                </div>
                <div className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                  Shortcut totals: E {shortcutTotals.editorClicks} · S {shortcutTotals.storefrontClicks} · P {shortcutTotals.publishClicks}
                </div>
                <button
                  className="rounded border px-2 py-1 text-[11px] hover:bg-slate-100"
                  onClick={resetShortcutStats}
                  disabled={busy}
                >
                  Reset shortcut stats
                </button>
                <button
                  className="rounded border px-2 py-1 text-[11px] hover:bg-slate-100"
                  onClick={() => void exportShortcutStats()}
                  disabled={busy}
                >
                  Export shortcut stats
                </button>
              </div>
            </div>

            {loading ? <div className="mt-4 text-sm text-slate-600">Loading projects...</div> : null}
            {error ? <div className="mt-4 text-sm text-rose-700">{error}</div> : null}

            {!loading && !filteredSites.length ? (
              <div className="mt-4 rounded border border-dashed px-3 py-4 text-sm text-slate-600">
                No sites matched your filter. Create your first site from the panel.
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {filteredSites.map((site) => {
                const pages = pagesBySite[site.id] || [];
                const domains = domainsBySite[site.id] || [];
                const themeInstall = themeInstallBySite[site.id];
                const themeVersions = themeVersionBySite[site.id] || {
                  draft: null,
                  published: null,
                };
                const shortcutStats = shortcutStatsBySite[site.id] || emptyShortcutStats();
                const latestThemeAudit = latestThemeAuditBySite[site.id];
                const pageDraft = pageDraftBySite[site.id] || defaultDraft;
                const domainDraft = domainDraftBySite[site.id] || '';
                const latestPage = pages[0] || null;
                const publishedPage = pages.find((item) => item.isPublished) || latestPage;
                const liveStorefrontUrl = storefrontUrlForSite(site, domains, publishedPage);

                return (
                  <section key={site.id} className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{site.name}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          siteId: <span className="font-mono">{site.id}</span>
                        </div>
                        <div className="text-xs text-slate-600">domain: {site.domain || 'not set'}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                            Published theme version:{' '}
                            <span className="font-mono">
                              {themeVersions.published?.version || themeInstall?.publishedThemeVersionId || '—'}
                            </span>
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              themeStatusChipClass(themeVersions.published?.status)
                            }`}
                          >
                            Published status: {themeVersions.published?.status || 'UNKNOWN'}
                          </span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                            Draft theme version:{' '}
                            <span className="font-mono">
                              {themeVersions.draft?.version || themeInstall?.draftThemeVersionId || '—'}
                            </span>
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              themeStatusChipClass(themeVersions.draft?.status)
                            }`}
                          >
                            Draft status: {themeVersions.draft?.status || 'UNKNOWN'}
                          </span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                            Last release:{' '}
                            <span className="font-medium">
                              {latestThemeAudit
                                ? new Date(latestThemeAudit.createdAt).toLocaleString()
                                : 'never'}
                            </span>
                          </span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                            Shortcut clicks:{' '}
                            <span className="font-medium">
                              E {shortcutStats.editorClicks} · S {shortcutStats.storefrontClicks} · P {shortcutStats.publishClicks}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {latestPage ? (
                            <Link
                              className="rounded border bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
                              href={`/editor/${encodeURIComponent(latestPage.id)}`}
                              onClick={() => trackShortcutAction(site.id, 'editor')}
                            >
                              Open Latest Editor
                            </Link>
                          ) : (
                            <span className="rounded border bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                              No page to edit yet
                            </span>
                          )}
                          <a
                            className="rounded border bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
                            href={liveStorefrontUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackShortcutAction(site.id, 'storefront')}
                          >
                            Open Live Storefront
                          </a>
                        </div>
                      </div>
                      <Link
                        className="rounded border bg-white px-3 py-2 text-xs"
                        href={`/sites/${encodeURIComponent(site.id)}/publish`}
                        onClick={() => trackShortcutAction(site.id, 'publish')}
                      >
                        Publish Center
                      </Link>
                    </div>

                    <div className="mt-4 rounded border bg-white p-3">
                      <div className="text-xs font-semibold text-slate-700">Domains</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-5">
                        <input
                          className="rounded border px-2 py-2 text-sm md:col-span-4"
                          placeholder="shop.example.com"
                          value={domainDraft}
                          onChange={(event) =>
                            setDomainDraftBySite((prev) => ({ ...prev, [site.id]: event.target.value }))
                          }
                        />
                        <button
                          className="rounded bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-50 md:col-span-1"
                          onClick={() => void createDomain(site.id)}
                          disabled={busy}
                        >
                          Add Domain
                        </button>
                      </div>
                      <div className="mt-2 space-y-2">
                        {domains.map((domain) => (
                          <div key={domain.id} className="flex items-center justify-between gap-3 rounded border bg-slate-50 px-2 py-2 text-xs">
                            <div className="font-mono break-all">{domain.host}</div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-1 ${
                                  domain.status === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : domain.status === 'FAILED'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {domain.status}
                              </span>
                              <button
                                className="rounded border px-2 py-1 text-[11px] disabled:opacity-50"
                                onClick={() => void verifyDomain(domain.id)}
                                disabled={busy}
                              >
                                Verify
                              </button>
                            </div>
                          </div>
                        ))}
                        {!domains.length ? <div className="text-xs text-slate-500">No domains mapped yet for this site.</div> : null}
                      </div>
                    </div>

                    <div className="mt-4 rounded border bg-white p-3">
                      <div className="text-xs font-semibold text-slate-700">Add Page</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-5">
                        <input
                          className="rounded border px-2 py-2 text-sm md:col-span-2"
                          placeholder="Title"
                          value={pageDraft.title}
                          onChange={(event) => updatePageDraft(site.id, 'title', event.target.value)}
                        />
                        <input
                          className="rounded border px-2 py-2 text-sm md:col-span-2"
                          placeholder="Slug"
                          value={pageDraft.slug}
                          onChange={(event) => updatePageDraft(site.id, 'slug', event.target.value)}
                        />
                        <button
                          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50 md:col-span-1"
                          onClick={() => void createPage(site.id)}
                          disabled={busy}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {pages.map((page) => (
                        <div key={page.id} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-3 py-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{page.title}</div>
                            <div className="text-xs text-slate-600">
                              /{page.slug} · pageId: <span className="font-mono">{page.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-1 text-[11px] ${
                                page.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {page.isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            <Link className="rounded border bg-white px-2 py-1 text-xs" href={`/editor/${encodeURIComponent(page.id)}`}>
                              Edit
                            </Link>
                            <Link className="rounded border bg-white px-2 py-1 text-xs" href={`/preview/${encodeURIComponent(page.id)}`}>
                              Preview
                            </Link>
                          </div>
                        </div>
                      ))}
                      {!pages.length ? <div className="text-xs text-slate-500">No pages yet for this site.</div> : null}
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

