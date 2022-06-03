/**
 * File: apps/builder/src/app/themes/versions/[themeVersionId]/theme-version-editor.client.tsx
 * Module: builder-themes
 * Purpose: Theme file editor with build telemetry, search, and publish confidence tooling
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { apiGet, apiPost, apiPut } from '../../../../lib/api';

type ThemeFile = { id: string; path: string; size: number; sha256?: string | null };
type ThemeVersion = {
  id: string;
  themeId: string;
  version: string;
  status: string;
  buildLog?: string | null;
  manifest?: any;
};

type BuildJob = {
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string | null;
};

function buildBadgeClass(status?: string | null) {
  switch (status) {
    case 'BUILT':
    case 'SUCCEEDED':
      return 'bg-emerald-100 text-emerald-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    case 'QUEUED':
    case 'BUILDING':
    case 'RUNNING':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function ThemeVersionEditorClient({ themeVersionId }: { themeVersionId: string }) {
  const [files, setFiles] = useState<ThemeFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileQuery, setFileQuery] = useState('');
  const [content, setContent] = useState('');
  const [loadedContent, setLoadedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [siteId, setSiteId] = useState('');
  const [themeVersion, setThemeVersion] = useState<ThemeVersion | null>(null);
  const [lastBuildJobId, setLastBuildJobId] = useState<string | null>(null);
  const [buildJobStatus, setBuildJobStatus] = useState<BuildJob['status'] | null>(null);
  const [buildJobError, setBuildJobError] = useState<string | null>(null);

  const selectedFile = useMemo(
    () => files.find((f) => f.path === selectedPath) || null,
    [files, selectedPath],
  );

  const filteredFiles = useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, fileQuery]);

  const isFileDirty = selectedPath !== null && content !== loadedContent;

  const storefrontBase = (process.env.NEXT_PUBLIC_STOREFRONT_URL as string) || 'http://localhost:4201';
  const previewUrl = `${storefrontBase}/?previewThemeVersionId=${encodeURIComponent(themeVersionId)}`;
  const publishedUrl = `${storefrontBase}/`;

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

  const loadFile = async (path: string) => {
    const file = await apiGet<{ path: string; content: string }>(
      `/api/themes/versions/${themeVersionId}/file?path=${encodeURIComponent(path)}`,
    );
    setContent(file.content);
    setLoadedContent(file.content);
  };

  useEffect(() => {
    void reload();
  }, [themeVersionId]);

  useEffect(() => {
    if (!selectedPath) return;
    void loadFile(selectedPath).catch((e: any) =>
      alert(e?.message || 'Failed to load file'),
    );
  }, [selectedPath, themeVersionId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      if (!isFileDirty) return;
      void save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    if (!lastBuildJobId) return;
    if (buildJobStatus === 'SUCCEEDED' || buildJobStatus === 'FAILED') return;

    const timer = window.setInterval(() => {
      void apiGet<BuildJob>(`/api/themes/build-jobs/${lastBuildJobId}`)
        .then(async (job) => {
          setBuildJobStatus(job.status);
          setBuildJobError(job.error || null);
          if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
            await reload();
          }
        })
        .catch(() => undefined);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [lastBuildJobId, buildJobStatus]);

  const save = async () => {
    if (!selectedPath) return;
    setBusy('save');
    try {
      await apiPut(`/api/themes/versions/${themeVersionId}/file?path=${encodeURIComponent(selectedPath)}`, {
        content,
      });
      setLoadedContent(content);
      await reload();
      alert('Saved');
    } finally {
      setBusy(null);
    }
  };

  const build = async () => {
    setBusy('build');
    try {
      const res = await apiPost<{ jobId: string; status: BuildJob['status'] }>(
        `/api/themes/versions/${themeVersionId}/build`,
      );
      setLastBuildJobId(res.jobId);
      setBuildJobStatus(res.status);
      setBuildJobError(null);
    } finally {
      setBusy(null);
    }
  };

  const refreshBuildJob = async () => {
    if (!lastBuildJobId) return;
    const job = await apiGet<BuildJob>(`/api/themes/build-jobs/${lastBuildJobId}`);
    setBuildJobStatus(job.status);
    setBuildJobError(job.error || null);
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
      await reload();
    }
  };

  const install = async () => {
    if (!siteId.trim()) return alert('Enter siteId');
    if (!themeVersion?.themeId) return alert('Theme version missing themeId');
    setBusy('install');
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId.trim())}/theme/install`, {
        themeId: themeVersion.themeId,
        themeVersionId,
      });
      alert('Installed as draft');
    } finally {
      setBusy(null);
    }
  };

  const seedDemoProduct = async () => {
    if (!siteId.trim()) return alert('Enter siteId');
    setBusy('seed');
    try {
      await apiPost(`/api/commerce/sites/${encodeURIComponent(siteId.trim())}/products/seed`);
      alert('Seeded demo product (if not already present).');
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!siteId.trim()) return alert('Enter siteId');
    if (themeVersion?.status !== 'BUILT') return alert('Build theme successfully before publishing.');
    setBusy('publish');
    try {
      await apiPost(`/api/sites/${encodeURIComponent(siteId.trim())}/theme/publish`, {
        themeVersionId,
      });
      alert('Published');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

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
          <Link href={`/themes/versions/${themeVersionId}/settings`} className="px-3 py-2 rounded border">
            Settings
          </Link>
          {siteId.trim() ? (
            <Link href={`/sites/${encodeURIComponent(siteId.trim())}/publish`} className="px-3 py-2 rounded border">
              Publish Center
            </Link>
          ) : null}
          <button
            onClick={() => void save()}
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={busy !== null || !selectedPath || !isFileDirty}
          >
            Save (Ctrl/Cmd+S)
          </button>
          <button
            onClick={() => void build()}
            className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
            disabled={busy !== null}
          >
            Build
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r bg-white overflow-auto p-3">
          <div className="text-sm font-semibold mb-2">Files</div>
          <input
            className="w-full border rounded px-2 py-1 text-sm mb-2"
            placeholder="Search files..."
            value={fileQuery}
            onChange={(e) => setFileQuery(e.target.value)}
          />
          <div className="space-y-1">
            {filteredFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  if (isFileDirty && selectedPath && selectedPath !== f.path) {
                    const proceed = window.confirm('You have unsaved changes. Continue and discard them?');
                    if (!proceed) return;
                  }
                  setSelectedPath(f.path);
                }}
                className={`w-full text-left px-2 py-1 rounded text-sm font-mono ${
                  f.path === selectedPath ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                {f.path}
              </button>
            ))}
            {!filteredFiles.length ? (
              <div className="text-xs text-gray-500">No files match your search.</div>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="p-2 border-b bg-gray-50 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-600">
              {selectedFile ? (
                <>
                  <span className="font-mono">{selectedFile.path}</span> · {selectedFile.size} bytes
                  {isFileDirty ? <span className="ml-2 text-amber-700">(unsaved)</span> : null}
                </>
              ) : (
                'No file selected'
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="siteId for install/publish"
                className="border rounded px-2 py-1 text-sm w-56"
              />
              <button
                onClick={() => void install()}
                className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50"
                disabled={busy !== null}
              >
                Install Draft
              </button>
              <button
                onClick={() => void seedDemoProduct()}
                className="px-3 py-2 rounded bg-amber-600 text-white text-sm disabled:opacity-50"
                disabled={busy !== null}
              >
                Seed Product
              </button>
              <button
                onClick={() => void publish()}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
                disabled={busy !== null}
              >
                Publish
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded border text-sm"
                title="Preview draft theme in storefront"
              >
                Preview
              </a>
              <a
                href={publishedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded border text-sm"
                title="Open published storefront"
              >
                Open Storefront
              </a>
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

          <div className="border-t bg-white p-3 space-y-2">
            <div className="text-sm font-semibold">Build Status</div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${buildBadgeClass(themeVersion?.status)}`}>
                Version: {themeVersion?.status || 'Unknown'}
              </span>
              {buildJobStatus ? (
                <span className={`text-xs px-2 py-1 rounded ${buildBadgeClass(buildJobStatus)}`}>
                  Job: {buildJobStatus}
                </span>
              ) : null}
              {lastBuildJobId ? (
                <button
                  className="text-xs px-2 py-1 border rounded"
                  onClick={() => void refreshBuildJob()}
                >
                  Refresh Job
                </button>
              ) : null}
            </div>
            {lastBuildJobId ? (
              <div className="text-xs text-gray-500">
                jobId: <span className="font-mono">{lastBuildJobId}</span>
              </div>
            ) : null}
            {buildJobError ? (
              <div className="text-xs text-red-600">{buildJobError}</div>
            ) : null}
            {themeVersion?.buildLog ? (
              <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-40">
                {themeVersion.buildLog}
              </pre>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
