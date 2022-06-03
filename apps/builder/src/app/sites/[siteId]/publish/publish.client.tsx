/**
 * @file publish.client.tsx
 * @module builder-publish
 * @description Publish center for theme/settings/layouts/pages with audit and rollback visibility
 * @author BharatERP
 * @created 2026-02-15
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

function statusBadgeClass(status: string) {
  switch (status) {
    case 'BUILT':
      return 'bg-emerald-100 text-emerald-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    case 'BUILDING':
    case 'QUEUED':
      return 'bg-amber-100 text-amber-700';
    case 'PUBLISHED':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
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

  const templateIds = useMemo(() => {
    const routes = themeVersion?.manifest?.routes;
    if (!Array.isArray(routes)) return [];
    return Array.from(
      new Set(routes.map((r: any) => r?.template).filter(Boolean).map(String)),
    );
  }, [themeVersion]);

  const publishHealth = useMemo(() => {
    const draftReady = Boolean(install?.draftThemeVersionId);
    const buildReady = themeVersion?.status === 'BUILT';
    const hasTemplates = templateIds.length > 0;
    const hasPages = pages.length > 0;
    return { draftReady, buildReady, hasTemplates, hasPages };
  }, [install, themeVersion, templateIds, pages.length]);

  const reload = async () => {
    setLoading(true);
    try {
      const inst = await apiGet<ThemeInstall>(`/api/sites/${encodeURIComponent(siteId)}/theme`);
      setInstall(inst);

      const versionId = inst?.draftThemeVersionId || inst?.publishedThemeVersionId || null;
      if (versionId) {
        const tv = await apiGet<ThemeVersion>(`/api/themes/versions/${versionId}`);
        setThemeVersion(tv);
      } else {
        setThemeVersion(null);
      }

      const [ps, auditRows] = await Promise.all([
        apiGet<Page[]>(`/api/sites/${encodeURIComponent(siteId)}/pages`),
        apiGet<ThemeAudit[]>(`/api/sites/${encodeURIComponent(siteId)}/theme/audits`),
      ]);
      setPages(ps);
      setAudits(auditRows);

      if (inst?.themeId) {
        const theme = await apiGet<Theme>(`/api/themes/${encodeURIComponent(inst.themeId)}`);
        setThemeVersions(theme.versions || []);
      } else {
        setThemeVersions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [siteId]);

  const publishTheme = async () => {
    setBusy('theme');
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/publish`, {
        themeVersionId: install?.draftThemeVersionId || undefined,
      });
      alert('Theme published');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const publishSettings = async () => {
    if (!themeVersion?.id) return alert('No theme version available');
    setBusy('settings');
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/settings/publish`, {
        themeVersionId: themeVersion.id,
      });
      alert('Settings published');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const publishLayouts = async () => {
    if (!themeVersion?.id) return alert('No theme version available');
    if (!templateIds.length) return alert('No templates found in manifest.routes');

    setBusy('layouts');
    try {
      for (const templateId of templateIds) {
        await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/layouts/publish`, {
          themeVersionId: themeVersion.id,
          templateId,
        });
      }
      alert('Layouts published');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const publishPages = async () => {
    if (!pages.length) return alert('No pages found');
    setBusy('pages');
    try {
      for (const p of pages) {
        await apiPost(`/api/sites/pages/${encodeURIComponent(p.id)}/publish`);
      }
      alert('Pages published');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const rollbackTheme = async () => {
    if (!rollbackToId.trim()) return alert('Choose a target theme version for rollback');
    setBusy('rollback');
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/rollback`, {
        toThemeVersionId: rollbackToId.trim(),
      });
      alert('Rollback completed');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Publish Center</h1>
          <div className="text-sm text-gray-600 mt-1">
            siteId: <span className="font-mono">{siteId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded border" href="/themes">
            Themes
          </Link>
          <button
            className="px-3 py-2 rounded border"
            onClick={() => void reload()}
            disabled={Boolean(busy)}
          >
            Refresh
          </button>
        </div>
      </div>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Readiness Snapshot</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3 text-xs">
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

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Theme</div>
        <div className="text-xs text-gray-500 mt-1">
          Draft themeVersionId: <span className="font-mono">{install?.draftThemeVersionId || '—'}</span> · Published:{' '}
          <span className="font-mono">{install?.publishedThemeVersionId || '—'}</span>
        </div>
        <div className="text-xs mt-2">
          {themeVersion?.status ? (
            <span className={`px-2 py-1 rounded ${statusBadgeClass(themeVersion.status)}`}>
              {themeVersion.status}
            </span>
          ) : (
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">No version selected</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
            onClick={publishTheme}
            disabled={busy !== null || themeVersion?.status !== 'BUILT'}
            title={themeVersion?.status !== 'BUILT' ? 'Build theme successfully before publishing.' : ''}
          >
            Publish Theme
          </button>
          {themeVersion?.id ? (
            <Link className="px-4 py-2 rounded border" href={`/themes/versions/${themeVersion.id}/settings`}>
              Edit Settings
            </Link>
          ) : null}
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Settings + Layouts + Pages</div>
        <div className="text-xs text-gray-500 mt-1">
          Publish these in sequence to keep storefront state consistent.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={publishSettings}
            disabled={busy !== null}
          >
            Publish Settings
          </button>
          <button
            className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
            onClick={publishLayouts}
            disabled={busy !== null}
          >
            Publish Layouts
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
            onClick={publishPages}
            disabled={busy !== null}
          >
            Publish Pages
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {templateIds.map((tid) => (
            <Link
              key={tid}
              className="px-3 py-2 rounded border text-sm font-mono"
              href={`/sites/${encodeURIComponent(siteId)}/theme/templates/${encodeURIComponent(tid)}`}
            >
              {tid}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Rollback</div>
        <div className="text-xs text-gray-500 mt-1">
          Roll back to a previously built/published theme version if needed.
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="border rounded px-3 py-2 text-sm min-w-80"
            value={rollbackToId}
            onChange={(e) => setRollbackToId(e.target.value)}
          >
            <option value="">Select target version...</option>
            {themeVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.version || v.id} ({v.status}) · {v.id}
              </option>
            ))}
          </select>
          <button
            className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-50"
            onClick={rollbackTheme}
            disabled={busy !== null || !rollbackToId}
          >
            Rollback Theme
          </button>
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Theme Publish History</div>
        <div className="mt-3 space-y-2">
          {audits.map((audit) => (
            <div key={audit.id} className="border rounded p-2 bg-gray-50 text-xs">
              <div className="font-semibold">{audit.action}</div>
              <div className="text-gray-600 mt-1">
                actor: <span className="font-mono">{audit.actor}</span>
              </div>
              <div className="text-gray-600">
                from: <span className="font-mono">{audit.fromThemeVersionId || '—'}</span>
              </div>
              <div className="text-gray-600">
                to: <span className="font-mono">{audit.toThemeVersionId}</span>
              </div>
              <div className="text-gray-600">
                at: {new Date(audit.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {!audits.length ? (
            <div className="text-gray-500 text-sm">No publish history yet.</div>
          ) : null}
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Page Status</div>
        <div className="mt-3 space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border rounded p-2 bg-gray-50">
              <div>
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-gray-600">
                  slug: <span className="font-mono">{p.slug}</span> · id:{' '}
                  <span className="font-mono">{p.id}</span>
                </div>
              </div>
              <div className="text-xs">
                {p.isPublished ? (
                  <span className="text-green-700">PUBLISHED</span>
                ) : (
                  <span className="text-amber-700">DRAFT</span>
                )}
              </div>
            </div>
          ))}
          {!pages.length ? <div className="text-gray-500">No pages yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
