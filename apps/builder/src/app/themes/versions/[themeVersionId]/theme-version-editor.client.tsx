/**
 * File: apps/builder/src/app/themes/versions/[themeVersionId]/theme-version-editor.client.tsx
 * Module: builder-themes
 * Purpose: Theme file editor (Monaco) + build + install flow
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Saves via PUT /api/themes/versions/:id/file?path=...
 * - Builds via POST /api/themes/versions/:id/build
 * - Installs via POST /api/sites/:siteId/theme/install
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { apiGet, apiPost, apiPut } from '../../../../lib/api';

type ThemeFile = { id: string; path: string; size: number; sha256?: string | null };
type ThemeVersion = { id: string; themeId: string; version: string; status: string; buildLog?: string | null; manifest?: any };
type Theme = { id: string; name: string };

export default function ThemeVersionEditorClient({ themeVersionId }: { themeVersionId: string }) {
  const [files, setFiles] = useState<ThemeFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string>('');
  const [themeVersion, setThemeVersion] = useState<ThemeVersion | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const selectedFile = useMemo(() => files.find((f) => f.path === selectedPath) || null, [files, selectedPath]);

  const reload = async () => {
    setLoading(true);
    try {
      const v = await apiGet<ThemeVersion>(`/api/themes/versions/${themeVersionId}`);
      setThemeVersion(v);
      const fileList = await apiGet<ThemeFile[]>(`/api/themes/versions/${themeVersionId}/files`);
      setFiles(fileList);
      if (!selectedPath && fileList[0]) setSelectedPath(fileList[0].path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersionId]);

  useEffect(() => {
    if (!selectedPath) return;
    console.debug('[builder-themes] loading file', { themeVersionId, path: selectedPath });
    apiGet<{ path: string; content: string }>(`/api/themes/versions/${themeVersionId}/file?path=${encodeURIComponent(selectedPath)}`)
      .then((r) => setContent(r.content))
      .catch((e) => alert(e?.message || 'Failed to load file'));
  }, [selectedPath, themeVersionId]);

  const save = async () => {
    if (!selectedPath) return;
    await apiPut(`/api/themes/versions/${themeVersionId}/file?path=${encodeURIComponent(selectedPath)}`, { content });
    await reload();
    alert('Saved');
  };

  const build = async () => {
    const res = await apiPost<{ themeVersionId: string; status: string; output?: string; error?: string }>(
      `/api/themes/versions/${themeVersionId}/build`,
    );
    console.debug('[builder-themes] build result', res);
    await reload();
    alert(`Build: ${res.status}`);
  };

  const install = async () => {
    if (!siteId) return alert('Enter siteId');
    if (!themeVersion?.themeId) return alert('Theme version missing themeId');
    const res = await apiPost(`/api/sites/${siteId}/theme/install`, {
      themeId: themeVersion.themeId,
      themeVersionId,
    });
    console.debug('[builder-themes] install result', res);
    alert('Installed as draft');
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="p-4 border-b bg-white flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Theme Version</div>
          <div className="font-mono text-sm">{themeVersionId}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/themes" className="px-3 py-2 rounded border">
            Back
          </Link>
          <button onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white">
            Save
          </button>
          <button onClick={build} className="px-3 py-2 rounded bg-purple-600 text-white">
            Build
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r bg-white overflow-auto p-3">
          <div className="text-sm font-semibold mb-2">Files</div>
          <div className="space-y-1">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedPath(f.path)}
                className={`w-full text-left px-2 py-1 rounded text-sm font-mono ${
                  f.path === selectedPath ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                {f.path}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="p-2 border-b bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {selectedFile ? (
                <>
                  <span className="font-mono">{selectedFile.path}</span> · {selectedFile.size} bytes
                </>
              ) : (
                'No file selected'
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="siteId to install"
                className="border rounded px-2 py-1 text-sm w-56"
              />
              <button onClick={install} className="px-3 py-2 rounded bg-green-600 text-white text-sm">
                Install (Draft)
              </button>
            </div>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              value={content}
              onChange={(v) => setContent(v || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="border-t bg-white p-3">
            <div className="text-sm font-semibold">Build Status</div>
            <div className="text-sm text-gray-600 mt-1">
              {themeVersion?.status ? <span>{themeVersion.status}</span> : <span>Unknown</span>}
            </div>
            {themeVersion?.buildLog && (
              <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-40">
                {themeVersion.buildLog}
              </pre>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


