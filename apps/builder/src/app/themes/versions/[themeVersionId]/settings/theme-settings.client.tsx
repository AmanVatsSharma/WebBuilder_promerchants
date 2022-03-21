/**
 * File: apps/builder/src/app/themes/versions/[themeVersionId]/settings/theme-settings.client.tsx
 * Module: builder-themes
 * Purpose: Schema-driven theme settings editor (draft/publish + preview)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Reads ThemeManifestV1.settingsSchema from the ThemeVersion endpoint
 * - Saves draft/publish via /api/sites/:siteId/theme/settings/*
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPut } from '../../../../../lib/api';
import { parseThemeManifestV1, type ThemeManifestV1 } from '@web-builder/contracts';

type ThemeVersion = { id: string; themeId: string; version: string; status: string; manifest?: any };

type SettingsDoc = {
  siteId: string;
  draft: { themeVersionId: string | null; settings: Record<string, unknown> };
  published: { themeVersionId: string | null; settings: Record<string, unknown> };
};

function defaultSettingsFromSchema(manifest: ThemeManifestV1): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const schema = manifest.settingsSchema;
  if (!schema) return out;
  for (const g of schema.groups || []) {
    for (const f of g.fields || []) {
      if (f && typeof f.id === 'string' && (out[f.id] === undefined)) {
        // @ts-expect-error schema union
        out[f.id] = f.default;
      }
    }
  }
  return out;
}

function mergeSettings(base: Record<string, unknown>, overrides: Record<string, unknown>) {
  return { ...base, ...(overrides || {}) };
}

export default function ThemeSettingsClient({ themeVersionId }: { themeVersionId: string }) {
  const [siteId, setSiteId] = useState('');
  const [themeVersion, setThemeVersion] = useState<ThemeVersion | null>(null);
  const [manifest, setManifest] = useState<ThemeManifestV1 | null>(null);
  const [settingsDoc, setSettingsDoc] = useState<SettingsDoc | null>(null);
  const [draftSettings, setDraftSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storefrontBase = (process.env.NEXT_PUBLIC_STOREFRONT_URL as string) || 'http://localhost:4201';
  const previewUrl = useMemo(
    () => `${storefrontBase}/?previewThemeVersionId=${encodeURIComponent(themeVersionId)}`,
    [storefrontBase, themeVersionId],
  );

  const schemaDefaults = useMemo(() => (manifest ? defaultSettingsFromSchema(manifest) : {}), [manifest]);
  const effectiveSettings = useMemo(() => mergeSettings(schemaDefaults, draftSettings), [schemaDefaults, draftSettings]);

  const loadThemeVersion = async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await apiGet<ThemeVersion>(`/api/themes/versions/${themeVersionId}`);
      setThemeVersion(v);
      const parsed = parseThemeManifestV1(v.manifest);
      if (!parsed.ok) {
        setManifest(null);
        setError(`Invalid manifest: ${parsed.errors.join('; ')}`);
      } else {
        setManifest(parsed.value);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load theme version');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!siteId) return;
    try {
      const doc = await apiGet<SettingsDoc>(`/api/sites/${encodeURIComponent(siteId)}/theme/settings`);
      setSettingsDoc(doc);
      setDraftSettings(doc.draft?.settings || {});
    } catch (e: any) {
      alert(e?.message || 'Failed to load settings');
    }
  };

  useEffect(() => {
    void loadThemeVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersionId]);

  const saveDraft = async () => {
    if (!siteId) return alert('Enter siteId');
    await apiPut(`/api/sites/${encodeURIComponent(siteId)}/theme/settings/draft`, {
      themeVersionId,
      settings: effectiveSettings,
    });
    await loadSettings();
    alert('Saved draft settings');
  };

  const publish = async () => {
    if (!siteId) return alert('Enter siteId');
    await apiPost(`/api/sites/${encodeURIComponent(siteId)}/theme/settings/publish`, { themeVersionId });
    await loadSettings();
    alert('Published settings');
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="p-4 border-b bg-white flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Theme Settings</div>
          <div className="font-mono text-sm">{themeVersionId}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/themes/versions/${themeVersionId}`} className="px-3 py-2 rounded border">
            Back to Files
          </Link>
          <a href={previewUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded border">
            Preview (Draft)
          </a>
          <button onClick={saveDraft} className="px-3 py-2 rounded bg-blue-600 text-white">
            Save Draft
          </button>
          <button onClick={publish} className="px-3 py-2 rounded bg-indigo-600 text-white">
            Publish
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r bg-white overflow-auto p-4">
          <div className="text-sm font-semibold">Target site</div>
          <div className="mt-2 flex gap-2">
            <input
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              placeholder="siteId"
              className="border rounded px-2 py-2 text-sm flex-1"
            />
            <button onClick={loadSettings} className="px-3 py-2 rounded border text-sm">
              Load
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Draft settings are used automatically by preview mode (`previewThemeVersionId`). Published settings are used on live storefront.
          </div>

          {settingsDoc ? (
            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <div>
                <span className="font-semibold">Draft themeVersionId:</span> {settingsDoc.draft.themeVersionId || '—'}
              </div>
              <div>
                <span className="font-semibold">Published themeVersionId:</span> {settingsDoc.published.themeVersionId || '—'}
              </div>
            </div>
          ) : null}
        </aside>

        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {error ? <div className="text-red-600 mb-4">{error}</div> : null}

          {!manifest?.settingsSchema ? (
            <div className="text-gray-600">No `settingsSchema` found in manifest.json.</div>
          ) : (
            <div className="space-y-6">
              {manifest.settingsSchema.groups.map((g) => (
                <section key={g.id} className="bg-white border rounded p-4">
                  <div className="font-semibold">{g.label}</div>
                  <div className="mt-3 space-y-4">
                    {g.fields.map((f) => {
                      const value = effectiveSettings[f.id];
                      const onChange = (next: unknown) => setDraftSettings((prev) => ({ ...prev, [f.id]: next }));

                      return (
                        <div key={f.id}>
                          <label className="block text-sm font-medium mb-1">{f.label}</label>
                          {f.type === 'color' ? (
                            <input
                              type="color"
                              value={typeof value === 'string' ? value : f.default}
                              onChange={(e) => onChange(e.target.value)}
                            />
                          ) : f.type === 'number' ? (
                            <input
                              type="number"
                              className="border rounded px-2 py-1 text-sm w-48"
                              value={typeof value === 'number' ? value : f.default}
                              min={f.min}
                              max={f.max}
                              onChange={(e) => onChange(Number(e.target.value))}
                            />
                          ) : f.type === 'select' ? (
                            <select
                              className="border rounded px-2 py-1 text-sm w-64"
                              value={typeof value === 'string' ? value : f.default}
                              onChange={(e) => onChange(e.target.value)}
                            >
                              {f.options.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="border rounded px-2 py-1 text-sm w-full max-w-xl"
                              value={typeof value === 'string' ? value : f.default}
                              onChange={(e) => onChange(e.target.value)}
                            />
                          )}
                          <div className="text-xs text-gray-500 mt-1">id: {f.id}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

