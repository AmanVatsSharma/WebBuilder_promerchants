/**
 * @file publish.client.tsx
 * @module builder-publish
 * @description Publish center for theme/settings/layouts/pages with premium UX and rollback visibility
 * @author BharatERP
 * @created 2026-02-16
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../../lib/api';

type ThemeInstall = {
  siteId: string;
  themeId: string;
  draftThemeVersionId?: string | null;
  publishedThemeVersionId?: string | null;
};

type ThemeVersion = {
  id: string;
  version?: string;
  status: string;
  manifest?: any;
};

type Theme = {
  id: string;
  name: string;
  versions?: ThemeVersion[];
};

type ThemeAudit = {
  id: string;
  action: 'PUBLISH' | 'ROLLBACK';
  actor: string;
  fromThemeVersionId?: string | null;
  toThemeVersionId: string;
  createdAt: string;
};

type Page = {
  id: string;
  title: string;
  slug: string;
  isPublished?: boolean;
};

type NoticeTone = 'info' | 'success' | 'error';
type NoticeState = { tone: NoticeTone; message: string } | null;

function statusBadgeClass(status: string) {
  switch (status) {
    case 'BUILT':
      return 'bg-emerald-100 text-emerald-700';
    case 'FAILED':
      return 'bg-rose-100 text-rose-700';
    case 'BUILDING':
    case 'QUEUED':
      return 'bg-amber-100 text-amber-700';
    case 'PUBLISHED':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function noticeToneClass(tone: NoticeTone) {
  if (tone === 'success') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  if (tone === 'error') return 'bg-rose-50 border-rose-200 text-rose-800';
  return 'bg-blue-50 border-blue-200 text-blue-800';
}

export default function PublishClient({ siteId }: { siteId: string }) {
  const [install, setInstall] = useState<ThemeInstall | null>(null);
  const [themeVersion, setThemeVersion] = useState<ThemeVersion | null>(null);
  const [themeVersions, setThemeVersions] = useState<ThemeVersion[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [audits, setAudits] = useState<ThemeAudit[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rollbackToId, setRollbackToId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const templateIds = useMemo(() => {
    const routes = themeVersion?.manifest?.routes;
    if (!Array.isArray(routes)) return [];
    return Array.from(new Set(routes.map((route: any) => route?.template).filter(Boolean).map(String)));
  }, [themeVersion]);

  const publishHealth = useMemo(() => {
    return {
      draftReady: Boolean(install?.draftThemeVersionId),
      buildReady: themeVersion?.status === 'BUILT',
      hasTemplates: templateIds.length > 0,
      hasPages: pages.length > 0,
    };
  }, [install, themeVersion, templateIds, pages.length]);

  const reload = async () => {
    console.debug('[publish-center] reload:start', { siteId });
    setLoading(true);
    setError(null);
    try {
      const inst = await apiGet<ThemeInstall>(`/api/sites/${encodeURIComponent(siteId)}/theme`);
      setInstall(inst);

      const versionId = inst?.draftThemeVersionId || inst?.publishedThemeVersionId || null;
      if (versionId) {
        const currentThemeVersion = await apiGet<ThemeVersion>(`/api/themes/versions/${versionId}`);
        setThemeVersion(currentThemeVersion);
      } else {
        setThemeVersion(null);
      }

      const [sitePages, auditRows] = await Promise.all([
        apiGet<Page[]>(`/api/sites/${encodeURIComponent(siteId)}/pages`),
        apiGet<ThemeAudit[]>(`/api/sites/${encodeURIComponent(siteId)}/theme/audits`),
      ]);
      setPages(sitePages);
      setAudits(auditRows);

      if (inst?.themeId) {
        const theme = await apiGet<Theme>(`/api/themes/${encodeURIComponent(inst.themeId)}`);
        setThemeVersions(theme.versions || []);
      } else {
        setThemeVersions([]);
      }

      console.debug('[publish-center] reload:success', {
        siteId,
        pages: sitePages.length,
        audits: auditRows.length,
      });
    } catch (e: any) {
      console.error('[publish-center] reload:failed', { siteId, reason: e?.message || e });
      setError(e?.message || 'Failed to load publish center data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [siteId]);

  const publishTheme = async () => {
    setBusy('theme');
    setNotice({ tone: 'info', message: 'Publishing theme...' });
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/publish`, {
        themeVersionId: install?.draftThemeVersionId || undefined,
      });
      setNotice({ tone: 'success', message: 'Theme published successfully.' });
      await reload();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Theme publish failed.' });
    } finally {
      setBusy(null);
    }
  };

  const publishSettings = async () => {
    if (!themeVersion?.id) {
      setNotice({ tone: 'error', message: 'No theme version available.' });
      return;
    }
    setBusy('settings');
    setNotice({ tone: 'info', message: 'Publishing settings...' });
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/settings/publish`, {
        themeVersionId: themeVersion.id,
      });
      setNotice({ tone: 'success', message: 'Settings published successfully.' });
      await reload();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Settings publish failed.' });
    } finally {
      setBusy(null);
    }
  };

  const publishLayouts = async () => {
    if (!themeVersion?.id) {
      setNotice({ tone: 'error', message: 'No theme version available.' });
      return;
    }
    if (!templateIds.length) {
      setNotice({ tone: 'error', message: 'No templates found in manifest.routes.' });
      return;
    }

    setBusy('layouts');
    setNotice({ tone: 'info', message: 'Publishing layouts...' });
    try {
      for (const templateId of templateIds) {
        await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/layouts/publish`, {
          themeVersionId: themeVersion.id,
          templateId,
        });
      }
      setNotice({ tone: 'success', message: 'Layouts published successfully.' });
      await reload();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Layouts publish failed.' });
    } finally {
      setBusy(null);
    }
  };

  const publishPages = async () => {
    if (!pages.length) {
      setNotice({ tone: 'error', message: 'No pages found.' });
      return;
    }
    setBusy('pages');
    setNotice({ tone: 'info', message: 'Publishing pages...' });
    try {
      for (const page of pages) {
        await apiPost(`/api/sites/pages/${encodeURIComponent(page.id)}/publish`);
      }
      setNotice({ tone: 'success', message: 'Pages published successfully.' });
      await reload();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Pages publish failed.' });
    } finally {
      setBusy(null);
    }
  };

  const rollbackTheme = async () => {
    if (!rollbackToId.trim()) {
      setNotice({ tone: 'error', message: 'Choose a target theme version for rollback.' });
      return;
    }
    setBusy('rollback');
    setNotice({ tone: 'info', message: 'Running rollback...' });
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/rollback`, {
        toThemeVersionId: rollbackToId.trim(),
      });
      setNotice({ tone: 'success', message: 'Rollback completed successfully.' });
      await reload();
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message || 'Rollback failed.' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading publish center...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Publish Center</h1>
              <div className="mt-1 text-xs text-slate-200">
                siteId: <span className="font-mono">{siteId}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20" href="/themes">
                Themes
              </Link>
              <button
                className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
                onClick={() => void reload()}
                disabled={Boolean(busy)}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {notice ? (
          <div className={`rounded-lg border px-3 py-2 text-sm ${noticeToneClass(notice.tone)}`}>
            {notice.message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-slate-900">Readiness Snapshot</div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
            <div className={`rounded px-3 py-2 ${publishHealth.draftReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              Draft selected: {publishHealth.draftReady ? 'Yes' : 'No'}
            </div>
            <div className={`rounded px-3 py-2 ${publishHealth.buildReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              Build status: {themeVersion?.status || 'Unknown'}
            </div>
            <div className={`rounded px-3 py-2 ${publishHealth.hasTemplates ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              Templates: {templateIds.length}
            </div>
            <div className={`rounded px-3 py-2 ${publishHealth.hasPages ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              Pages: {pages.length}
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-slate-900">Theme</div>
          <div className="mt-1 text-xs text-slate-500">
            Draft: <span className="font-mono">{install?.draftThemeVersionId || '—'}</span> · Published:{' '}
            <span className="font-mono">{install?.publishedThemeVersionId || '—'}</span>
          </div>
          <div className="mt-2 text-xs">
            {themeVersion?.status ? (
              <span className={`rounded px-2 py-1 ${statusBadgeClass(themeVersion.status)}`}>
                {themeVersion.status}
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">No version selected</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={publishTheme}
              disabled={busy !== null || themeVersion?.status !== 'BUILT'}
              title={themeVersion?.status !== 'BUILT' ? 'Build theme successfully before publishing.' : ''}
            >
              Publish Theme
            </button>
            {themeVersion?.id ? (
              <Link className="rounded border px-4 py-2 text-sm" href={`/themes/versions/${themeVersion.id}/settings`}>
                Edit Settings
              </Link>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-slate-900">Settings + Layouts + Pages</div>
          <div className="mt-1 text-xs text-slate-500">
            Publish these in sequence to keep storefront state consistent.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={publishSettings}
              disabled={busy !== null}
            >
              Publish Settings
            </button>
            <button
              className="rounded bg-purple-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={publishLayouts}
              disabled={busy !== null}
            >
              Publish Layouts
            </button>
            <button
              className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={publishPages}
              disabled={busy !== null}
            >
              Publish Pages
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {templateIds.map((templateId) => (
              <Link
                key={templateId}
                className="rounded border px-3 py-2 text-sm font-mono"
                href={`/sites/${encodeURIComponent(siteId)}/theme/templates/${encodeURIComponent(templateId)}`}
              >
                {templateId}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-slate-900">Rollback</div>
          <div className="mt-1 text-xs text-slate-500">
            Roll back to a previously built or published theme version if needed.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className="min-w-80 rounded border px-3 py-2 text-sm"
              value={rollbackToId}
              onChange={(e) => setRollbackToId(e.target.value)}
            >
              <option value="">Select target version...</option>
              {themeVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.version || version.id} ({version.status}) · {version.id}
                </option>
              ))}
            </select>
            <button
              className="rounded bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={rollbackTheme}
              disabled={busy !== null || !rollbackToId}
            >
              Rollback Theme
            </button>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-slate-900">Theme Publish History</div>
          <div className="mt-3 space-y-2">
            {audits.map((audit) => (
              <div key={audit.id} className="rounded border bg-slate-50 p-2 text-xs">
                <div className="font-semibold">{audit.action}</div>
                <div className="mt-1 text-slate-600">
                  actor: <span className="font-mono">{audit.actor}</span>
                </div>
                <div className="text-slate-600">
                  from: <span className="font-mono">{audit.fromThemeVersionId || '—'}</span>
                </div>
                <div className="text-slate-600">
                  to: <span className="font-mono">{audit.toThemeVersionId}</span>
                </div>
                <div className="text-slate-600">at: {new Date(audit.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {!audits.length ? <div className="text-sm text-slate-500">No publish history yet.</div> : null}
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="font-semibold text-slate-900">Page Status</div>
          <div className="mt-3 space-y-2">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between gap-3 rounded border bg-slate-50 p-2">
                <div>
                  <div className="text-sm font-semibold">{page.title}</div>
                  <div className="text-xs text-slate-600">
                    slug: <span className="font-mono">{page.slug}</span> · id:{' '}
                    <span className="font-mono">{page.id}</span>
                  </div>
                </div>
                <div className="text-xs">
                  {page.isPublished ? (
                    <span className="font-semibold text-emerald-700">PUBLISHED</span>
                  ) : (
                    <span className="font-semibold text-amber-700">DRAFT</span>
                  )}
                </div>
              </div>
            ))}
            {!pages.length ? <div className="text-sm text-slate-500">No pages yet.</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
