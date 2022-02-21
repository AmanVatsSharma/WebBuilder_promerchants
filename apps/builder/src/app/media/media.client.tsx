/**
 * File: apps/builder/src/app/media/media.client.tsx
 * Module: builder-media
 * Purpose: Client-side media manager (upload/list/copy URL)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';

type MediaItem = { key: string; url: string };

export default function MediaClient() {
  const [siteId, setSiteId] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const canLoad = useMemo(() => siteId.trim().length > 0, [siteId]);

  const load = async () => {
    if (!canLoad) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/media/sites/${encodeURIComponent(siteId)}/list`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      setItems((await res.json()) as MediaItem[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // no auto-load until siteId is filled
  }, []);

  const upload = async () => {
    if (!file) return alert('Pick a file first');
    if (!canLoad) return alert('Enter siteId');

    const form = new FormData();
    form.append('file', file);
    setLoading(true);
    try {
      const res = await fetch(`/api/media/sites/${encodeURIComponent(siteId)}/upload`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      console.debug('[builder-media] upload result', data);
      setFile(null);
      await load();
      alert('Uploaded');
    } catch (e: any) {
      console.error('[builder-media] upload failed', e);
      alert(e?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Media</h1>
          <p className="text-gray-600 mt-1">Upload and reuse assets in themes (copy URLs).</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          placeholder="siteId"
          className="border rounded px-3 py-2 w-64"
        />
        <button onClick={load} className="px-4 py-2 rounded border" disabled={!canLoad || loading}>
          Load
        </button>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={upload} className="px-4 py-2 rounded bg-blue-600 text-white" disabled={!file || !canLoad || loading}>
          Upload
        </button>
      </div>

      <div className="mt-6">
        {loading ? <div>Loading…</div> : null}
        {!loading && !items.length ? <div className="text-gray-500">No files yet.</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <div key={it.key} className="border rounded bg-white p-3">
              <div className="text-sm font-mono break-all">{it.key}</div>
              <div className="text-xs text-gray-500 mt-1 break-all">{it.url}</div>
              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-1 rounded border text-sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(it.url);
                    alert('Copied URL');
                  }}
                >
                  Copy URL
                </button>
                <a className="px-3 py-1 rounded border text-sm" href={it.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

