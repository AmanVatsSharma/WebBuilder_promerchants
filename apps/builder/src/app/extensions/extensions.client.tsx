/**
 * File: apps/builder/src/app/extensions/extensions.client.tsx
 * Module: builder-extensions
 * Purpose: Minimal extensions manager UI (upload/build/install and list site blocks)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiUpload } from '../../lib/api';

type Extension = { id: string; name: string; description?: string | null; author?: string | null };
type ExtensionVersion = { id: string; extensionId: string; version: string; status: string; buildLog?: string | null; manifest?: any };

export default function ExtensionsClient() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ExtensionVersion | null>(null);
  const [siteId, setSiteId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteBlocks, setSiteBlocks] = useState<any[]>([]);

  const canInstall = useMemo(() => siteId.trim().length > 0 && selectedVersion?.id, [siteId, selectedVersion]);

  const reload = async () => {
    const list = await apiGet<Extension[]>(`/api/extensions`);
    setExtensions(list);
  };

  useEffect(() => {
    void reload();
  }, []);

  const upload = async () => {
    if (!uploadFile) return alert('Pick a zip file');
    if (!uploadName.trim()) return alert('Enter extension name');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('bundle', uploadFile);
      form.append('name', uploadName.trim());
      const res = await apiUpload<{ extension: Extension; extensionVersion: ExtensionVersion }>(`/api/extensions/upload`, form);
      alert('Uploaded extension');
      setSelectedVersion(res.extensionVersion);
      setUploadFile(null);
      await reload();
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const build = async () => {
    if (!selectedVersion?.id) return alert('Select/upload a version first');
    setLoading(true);
    try {
      const res = await apiPost<ExtensionVersion>(`/api/extensions/versions/${selectedVersion.id}/build`);
      console.debug('[builder-extensions] build result', res);
      const v = await apiGet<ExtensionVersion>(`/api/extensions/versions/${selectedVersion.id}`);
      setSelectedVersion(v);
      alert('Build done (check status/logs)');
    } finally {
      setLoading(false);
    }
  };

  const install = async () => {
    if (!canInstall) return;
    setLoading(true);
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId)}/extensions/install`, {
        extensionId: selectedVersion!.extensionId,
        extensionVersionId: selectedVersion!.id,
      });
      alert('Installed extension to site');
    } finally {
      setLoading(false);
    }
  };

  const loadSiteBlocks = async () => {
    if (!siteId.trim()) return alert('Enter siteId');
    const blocks = await apiGet<any[]>(`/api/sites/${encodeURIComponent(siteId)}/extensions/blocks`);
    setSiteBlocks(blocks);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Extensions</h1>
      <p className="text-gray-600 mt-1">Upload/build/install app blocks (extensions) and expose them in Builder palette.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border rounded p-4">
          <div className="font-semibold">Upload extension bundle</div>
          <div className="text-xs text-gray-500 mt-1">Zip must include `extension.manifest.json` and referenced block entries.</div>
          <div className="mt-3 space-y-2">
            <input
              className="border rounded px-2 py-2 w-full"
              placeholder="Extension name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
            <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" onClick={upload} disabled={loading}>
              Upload
            </button>
          </div>
        </section>

        <section className="bg-white border rounded p-4">
          <div className="font-semibold">Extensions list</div>
          <div className="mt-3 space-y-2">
            {extensions.map((e) => (
              <div key={e.id} className="border rounded p-2">
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-gray-500 font-mono">{e.id}</div>
              </div>
            ))}
            {!extensions.length ? <div className="text-gray-500">No extensions uploaded yet.</div> : null}
          </div>
        </section>
      </div>

      <section className="mt-6 bg-white border rounded p-4">
        <div className="font-semibold">Build + install</div>
        <div className="text-xs text-gray-500 mt-1">
          After upload, copy the latest extensionVersionId from API response/logs (v1 UI is minimal) or keep the uploaded version selected.
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className="border rounded px-2 py-2 w-72" placeholder="siteId" value={siteId} onChange={(e) => setSiteId(e.target.value)} />
          <button className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50" onClick={build} disabled={!selectedVersion?.id || loading}>
            Build selected version
          </button>
          <button className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50" onClick={install} disabled={!canInstall || loading}>
            Install to site
          </button>
          <button className="px-4 py-2 rounded border disabled:opacity-50" onClick={loadSiteBlocks} disabled={!siteId.trim() || loading}>
            Load site blocks
          </button>
        </div>

        {selectedVersion ? (
          <div className="mt-4 text-sm">
            <div>
              Selected version: <span className="font-mono">{selectedVersion.id}</span> status: <span className="font-mono">{selectedVersion.status}</span>
            </div>
            {selectedVersion.buildLog ? (
              <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-48">{selectedVersion.buildLog}</pre>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500">No selected version yet. Upload one to auto-select.</div>
        )}

        {siteBlocks.length ? (
          <div className="mt-6">
            <div className="font-semibold">Site blocks</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {siteBlocks.map((b) => (
                <div key={String(b.type)} className="border rounded p-2 bg-gray-50">
                  <div className="font-semibold">{String(b.label)}</div>
                  <div className="text-xs text-gray-500 font-mono">{String(b.type)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

