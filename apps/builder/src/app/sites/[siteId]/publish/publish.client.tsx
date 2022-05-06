/**
 * @file publish.client.tsx
 * @module builder-publish
 * @description Publish wizard for a site (theme + settings + layouts + pages)
 * @author BharatERP
 * @created 2026-01-24
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';

type ThemeInstall = { siteId: string; themeId: string; draftThemeVersionId?: string | null; publishedThemeVersionId?: string | null };
type ThemeVersion = { id: string; status: string; manifest?: any };
type Page = { id: string; title: string; slug: string; isPublished?: boolean };

export default function PublishClient({ siteId }: { siteId: string }) {
  const [install, setInstall] = useState<ThemeInstall | null>(null);
  const [themeVersion, setThemeVersion] = useState<ThemeVersion | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const templateIds = useMemo(() => {
    const routes = themeVersion?.manifest?.routes;
    if (!Array.isArray(routes)) return [];
    return Array.from(new Set(routes.map((r: any) => r?.template).filter(Boolean).map(String)));
  }, [themeVersion]);

  const reload = async () => {
    setLoading(true);
    try {
      const inst = await apiGet<ThemeInstall>(`/api/sites/${encodeURIComponent(siteId)}/theme`);
      setInstall(inst);
      const tvId = inst?.draftThemeVersionId || inst?.publishedThemeVersionId || null;
      if (tvId) {
        const tv = await apiGet<ThemeVersion>(`/api/themes/versions/${tvId}`);
        setThemeVersion(tv);
      } else {
        setThemeVersion(null);
      }
      const ps = await apiGet<Page[]>(`/api/sites/${encodeURIComponent(siteId)}/pages`);
      setPages(ps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const publishTheme = async () => {
    setBusy('theme');
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/publish`, { themeVersionId: install?.draftThemeVersionId || undefined });
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
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/settings/publish`, { themeVersionId: themeVersion.id });
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
        // sequential for predictable logs
        // eslint-disable-next-line no-await-in-loop
        await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/layouts/publish`, { themeVersionId: themeVersion.id, templateId });
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
        // eslint-disable-next-line no-await-in-loop
        await apiPost(`/api/sites/pages/${encodeURIComponent(p.id)}/publish`);
      }
      alert('Pages published');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Publish</h1>
          <div className="text-sm text-gray-600 mt-1">siteId: <span className="font-mono">{siteId}</span></div>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded border" href="/themes">
            Themes
          </Link>
          <button className="px-3 py-2 rounded border" onClick={reload} disabled={Boolean(busy)}>
            Refresh
          </button>
        </div>
      </div>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Theme</div>
        <div className="text-xs text-gray-500 mt-1">
          Draft themeVersionId: <span className="font-mono">{install?.draftThemeVersionId || '—'}</span> · Published:{' '}
          <span className="font-mono">{install?.publishedThemeVersionId || '—'}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Current themeVersion status: <span className="font-mono">{themeVersion?.status || '—'}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
            onClick={publishTheme}
            disabled={busy !== null || themeVersion?.status !== 'BUILT'}
            title={themeVersion?.status !== 'BUILT' ? 'Build the theme successfully before publishing.' : ''}
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
        <div className="font-semibold">Settings</div>
        <div className="text-xs text-gray-500 mt-1">Publishes draft settings for this site.</div>
        <div className="mt-3">
          <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" onClick={publishSettings} disabled={busy !== null}>
            Publish Settings
          </button>
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <div className="font-semibold">Template Layouts</div>
        <div className="text-xs text-gray-500 mt-1">Publishes per-template layouts (sections on each template).</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50" onClick={publishLayouts} disabled={busy !== null}>
            Publish Layouts
          </button>
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
        <div className="font-semibold">Pages</div>
        <div className="text-xs text-gray-500 mt-1">
          Publishes page draft JSON into `publishedContent` so storefront serves it by default.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50" onClick={publishPages} disabled={busy !== null}>
            Publish All Pages
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border rounded p-2 bg-gray-50">
              <div>
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-gray-600">
                  slug: <span className="font-mono">{p.slug}</span> · id: <span className="font-mono">{p.id}</span>
                </div>
              </div>
              <div className="text-xs">
                {p.isPublished ? <span className="text-green-700">PUBLISHED</span> : <span className="text-amber-700">DRAFT</span>}
              </div>
            </div>
          ))}
          {!pages.length ? <div className="text-gray-500">No pages yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

