/**
 * File: apps/builder/src/app/themes/themes.client.tsx
 * Module: builder-themes
 * Purpose: Client UI for theme list + seed + navigation
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../lib/api';

type ThemeVersion = { id: string; version: string; status: string; createdAt: string };
type Theme = { id: string; name: string; description?: string | null; author?: string | null; versions?: ThemeVersion[] };

export default function ThemesClient() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Theme[]>('/api/themes');
      setThemes(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const seedDefault = async () => {
    try {
      await apiPost('/api/themes/seed/default');
      await reload();
    } catch (e: any) {
      alert(e?.message || 'Seed failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Themes</h1>
          <p className="text-gray-600 mt-1">
            Theme Store, file editing, building, and installing per site.
          </p>
        </div>
        <button onClick={seedDefault} className="px-4 py-2 rounded bg-green-600 text-white">
          Seed Default Theme
        </button>
      </div>

      {loading && <div className="mt-6">Loading…</div>}
      {error && <div className="mt-6 text-red-600">{error}</div>}

      <div className="mt-6 space-y-4">
        {themes.map((t) => (
          <div key={t.id} className="border rounded p-4 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold">{t.name}</div>
                <div className="text-sm text-gray-600">{t.description || '—'}</div>
                <div className="text-xs text-gray-500 mt-1">themeId={t.id}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Versions</div>
              {t.versions?.length ? (
                <div className="space-y-2">
                  {t.versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-4 border rounded px-3 py-2">
                      <div className="text-sm">
                        <span className="font-mono">{v.version}</span>{' '}
                        <span className="text-gray-500">({v.status})</span>
                        <div className="text-xs text-gray-500 font-mono">themeVersionId={v.id}</div>
                      </div>
                      <Link href={`/themes/versions/${v.id}`} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">
                        Open Editor
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No versions yet</div>
              )}
            </div>
          </div>
        ))}
        {!loading && !themes.length && (
          <div className="text-gray-500">No themes yet. Seed the default theme or upload a bundle.</div>
        )}
      </div>
    </div>
  );
}


