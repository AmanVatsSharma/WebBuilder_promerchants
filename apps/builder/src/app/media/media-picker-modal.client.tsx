/**
 * @file media-picker-modal.client.tsx
 * @module builder-media
 * @description Reusable media picker modal (list + upload + select URL)
 * @author BharatERP
 * @created 2026-01-24
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiUpload } from '../../lib/api';

type MediaItem = { key: string; url: string };

export function MediaPickerModal({
  siteId,
  isOpen,
  onClose,
  onPickUrl,
}: {
  siteId: string;
  isOpen: boolean;
  onClose(): void;
  onPickUrl(url: string): void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const canUse = useMemo(() => siteId.trim().length > 0, [siteId]);

  const load = async () => {
    if (!canUse) return;
    setLoading(true);
    try {
      const data = await apiGet<MediaItem[]>(`/api/media/sites/${encodeURIComponent(siteId)}/list`);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    if (!canUse) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiUpload(`/api/media/sites/${encodeURIComponent(siteId)}/upload`, form);
      setFile(null);
      await load();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, siteId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded border shadow-lg overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">Media Picker</div>
          <button className="px-3 py-1 rounded border" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4">
          {!canUse ? <div className="text-sm text-red-600">Missing siteId.</div> : null}

          <div className="flex flex-wrap items-center gap-3">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" onClick={upload} disabled={!file || loading || !canUse}>
              Upload
            </button>
            <button className="px-3 py-2 rounded border disabled:opacity-50" onClick={load} disabled={loading || !canUse}>
              Refresh
            </button>
            {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((it) => (
              <button
                key={it.key}
                className="text-left border rounded p-3 hover:bg-gray-50"
                onClick={() => {
                  console.debug('[builder-media] picked', { siteId, key: it.key, url: it.url });
                  onPickUrl(it.url);
                  onClose();
                }}
              >
                <div className="text-sm font-mono break-all">{it.key}</div>
                <div className="text-xs text-gray-500 mt-1 break-all">{it.url}</div>
              </button>
            ))}
            {!loading && !items.length ? <div className="text-sm text-gray-500">No media uploaded yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

