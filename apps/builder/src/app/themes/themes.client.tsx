/**
 * File: apps/builder/src/app/themes/themes.client.tsx
 * Module: builder-themes
 * Purpose: Client UX for theme inventory, upload, and editor navigation
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiUpload } from '../../lib/api';
import { InlineNotice, type NoticeTone } from '../../components/inline-notice';

type ThemeVersion = { id: string; version: string; status: string; createdAt: string };
type Theme = {
  id: string;
  name: string;
  description?: string | null;
  author?: string | null;
  pricingModel?: 'FREE' | 'PAID';
  priceCents?: number | null;
  currency?: string | null;
  licenseType?: string | null;
  isListed?: boolean;
  versions?: ThemeVersion[];
};

type NoticeState = { tone: NoticeTone; message: string } | null;

function formatPrice(theme: Theme) {
  if (theme.pricingModel !== 'PAID') return 'Free';
  const currency = String(theme.currency || 'USD').toUpperCase();
  const price = Number(theme.priceCents || 0) / 100;
  return `${currency} ${price.toFixed(2)}`;
}

function versionStatusClass(status: string) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'BUILT') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'FAILED') return 'bg-rose-100 text-rose-700';
  if (normalized === 'BUILDING') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

export default function ThemesClient() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const [uploadName, setUploadName] = useState('');
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadPricingModel, setUploadPricingModel] = useState<'FREE' | 'PAID'>('FREE');
  const [uploadPriceCents, setUploadPriceCents] = useState('');
  const [uploadCurrency, setUploadCurrency] = useState('USD');
  const [uploadLicenseType, setUploadLicenseType] = useState('SINGLE_STORE');
  const [uploadIsListed, setUploadIsListed] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [pricingFilter, setPricingFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
  const [listingFilter, setListingFilter] = useState<'ALL' | 'LISTED' | 'UNLISTED'>('ALL');

  const reload = async () => {
    console.debug('[themes] reload:start');
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Theme[]>('/api/themes');
      setThemes(data);
      console.debug('[themes] reload:success', { count: data.length });
    } catch (e: any) {
      console.error('[themes] reload:failed', { reason: e?.message || e });
      setError(e?.message || 'Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const seedDefault = async () => {
    console.debug('[themes] seedDefault:start');
    setSeeding(true);
    setNotice({ tone: 'info', message: 'Seeding default theme…' });
    try {
      await apiPost('/api/themes/seed/default');
      await reload();
      setNotice({ tone: 'success', message: 'Default theme seeded successfully.' });
    } catch (e: any) {
      console.error('[themes] seedDefault:failed', { reason: e?.message || e });
      setNotice({ tone: 'error', message: e?.message || 'Default theme seed failed.' });
    } finally {
      setSeeding(false);
    }
  };

  const validateUpload = () => {
    if (!uploadFile) return 'Pick a theme zip first.';
    if (!uploadName.trim()) return 'Theme name is required.';
    if (uploadPricingModel === 'PAID') {
      const cents = Number(uploadPriceCents);
      if (!Number.isFinite(cents) || cents < 0) {
        return 'PAID themes require a valid non-negative price.';
      }
    }
    return '';
  };

  const uploadTheme = async () => {
    const validationError = validateUpload();
    if (validationError) {
      setNotice({ tone: 'error', message: validationError });
      return;
    }

    console.debug('[themes] upload:start', {
      name: uploadName.trim(),
      version: uploadVersion.trim() || null,
      pricingModel: uploadPricingModel,
      listed: uploadIsListed,
    });
    setUploading(true);
    setNotice({ tone: 'info', message: 'Uploading theme bundle…' });
    try {
      const form = new FormData();
      form.append('bundle', uploadFile as Blob);
      form.append('name', uploadName.trim());
      if (uploadVersion.trim()) form.append('version', uploadVersion.trim());
      if (uploadDescription.trim()) form.append('description', uploadDescription.trim());
      if (uploadAuthor.trim()) form.append('author', uploadAuthor.trim());
      form.append('pricingModel', uploadPricingModel);
      if (uploadPricingModel === 'PAID' && uploadPriceCents.trim()) {
        form.append('priceCents', uploadPriceCents.trim());
      }
      if (uploadCurrency.trim()) form.append('currency', uploadCurrency.trim().toUpperCase());
      if (uploadLicenseType.trim()) form.append('licenseType', uploadLicenseType.trim());
      form.append('isListed', uploadIsListed ? 'true' : 'false');

      await apiUpload('/api/themes/upload', form);
      setUploadFile(null);
      setUploadName('');
      setUploadVersion('');
      setUploadDescription('');
      setUploadAuthor('');
      setUploadPricingModel('FREE');
      setUploadPriceCents('');
      setUploadCurrency('USD');
      setUploadLicenseType('SINGLE_STORE');
      setUploadIsListed(false);
      await reload();
      setNotice({ tone: 'success', message: 'Theme uploaded successfully.' });
    } catch (e: any) {
      console.error('[themes] upload:failed', { reason: e?.message || e });
      setNotice({ tone: 'error', message: e?.message || 'Theme upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const filteredThemes = useMemo(() => {
    return themes.filter((theme) => {
      const query = searchValue.trim().toLowerCase();
      const matchesQuery = !query
        ? true
        : [theme.name, theme.description, theme.author]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
      const matchesPricing =
        pricingFilter === 'ALL'
          ? true
          : String(theme.pricingModel || 'FREE').toUpperCase() === pricingFilter;
      const listed = Boolean(theme.isListed);
      const matchesListing =
        listingFilter === 'ALL'
          ? true
          : listingFilter === 'LISTED'
          ? listed
          : !listed;
      return matchesQuery && matchesPricing && matchesListing;
    });
  }, [themes, searchValue, pricingFilter, listingFilter]);

  const totalThemes = themes.length;
  const listedThemes = themes.filter((theme) => Boolean(theme.isListed)).length;
  const paidThemes = themes.filter((theme) => theme.pricingModel === 'PAID').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Theme Studio</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Curate theme inventory, package marketplace-ready metadata, and jump into version editors quickly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={seedDefault}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                disabled={seeding || uploading}
              >
                {seeding ? 'Seeding...' : 'Seed Default Theme'}
              </button>
              <button
                onClick={() => void reload()}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                disabled={loading || uploading || seeding}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-300">Total themes</div>
              <div className="mt-1 text-2xl font-semibold">{totalThemes}</div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-300">Marketplace listed</div>
              <div className="mt-1 text-2xl font-semibold">{listedThemes}</div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-300">Paid themes</div>
              <div className="mt-1 text-2xl font-semibold">{paidThemes}</div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {notice ? (
          <div className="mb-4">
            <InlineNotice
              tone={notice.tone}
              message={notice.message}
              onDismiss={() => setNotice(null)}
            />
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-slate-900">Upload Theme Bundle</h2>
            <p className="text-xs text-slate-500">
              Upload zip packages containing <span className="font-mono">manifest.json</span>, entry source, and template files.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Theme name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Version (optional)"
              value={uploadVersion}
              onChange={(e) => setUploadVersion(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Author (optional)"
              value={uploadAuthor}
              onChange={(e) => setUploadAuthor(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Description (optional)"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={uploadPricingModel}
              onChange={(e) => setUploadPricingModel((e.target.value as 'FREE' | 'PAID') || 'FREE')}
            >
              <option value="FREE">FREE</option>
              <option value="PAID">PAID</option>
            </select>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Price (cents, optional for PAID)"
              value={uploadPriceCents}
              onChange={(e) => setUploadPriceCents(e.target.value)}
              disabled={uploadPricingModel !== 'PAID'}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Currency (USD)"
              value={uploadCurrency}
              onChange={(e) => setUploadCurrency(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="License (SINGLE_STORE)"
              value={uploadLicenseType}
              onChange={(e) => setUploadLicenseType(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={uploadTheme}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={uploading || seeding}
            >
              {uploading ? 'Uploading...' : 'Upload Theme'}
            </button>
            {uploadFile ? (
              <div className="text-xs text-slate-600">
                Selected bundle: <span className="font-mono">{uploadFile.name}</span>
              </div>
            ) : null}
            <label className="text-xs text-slate-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={uploadIsListed}
                onChange={(e) => setUploadIsListed(e.target.checked)}
              />
              Listed in marketplace
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Theme inventory</h2>
              <p className="text-xs text-slate-500">
                Search and filter to focus on storefront-ready themes.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="Search name/author/description"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={pricingFilter}
                onChange={(e) => setPricingFilter((e.target.value as 'ALL' | 'FREE' | 'PAID') || 'ALL')}
              >
                <option value="ALL">All pricing</option>
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={listingFilter}
                onChange={(e) => setListingFilter((e.target.value as 'ALL' | 'LISTED' | 'UNLISTED') || 'ALL')}
              >
                <option value="ALL">All listing states</option>
                <option value="LISTED">Listed</option>
                <option value="UNLISTED">Unlisted</option>
              </select>
            </div>
          </div>

          {loading ? <div className="mt-6 text-sm text-slate-500">Loading themes…</div> : null}

          <div className="mt-4 space-y-4">
            {filteredThemes.map((theme) => (
              <article key={theme.id} className="rounded-xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{theme.name}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {theme.description || 'No description provided yet.'}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">
                        {formatPrice(theme)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          theme.isListed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {theme.isListed ? 'LISTED' : 'UNLISTED'}
                      </span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">
                        {theme.licenseType || 'SINGLE_STORE'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      themeId=<span className="font-mono">{theme.id}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>Author: {theme.author || 'Unknown'}</div>
                    <div className="mt-1">Versions: {theme.versions?.length || 0}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-sm font-semibold text-slate-800">Versions</div>
                  {theme.versions?.length ? (
                    <div className="space-y-2">
                      {theme.versions.map((version) => (
                        <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2">
                          <div className="text-sm">
                            <span className="font-mono">{version.version}</span>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${versionStatusClass(version.status)}`}>
                              {version.status}
                            </span>
                            <div className="mt-1 text-xs text-slate-500">
                              themeVersionId=<span className="font-mono">{version.id}</span>
                            </div>
                          </div>
                          <Link
                            href={`/themes/versions/${version.id}`}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Open Editor
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-white px-3 py-3 text-sm text-slate-500">
                      No versions yet. Upload a new bundle version to start editing.
                    </div>
                  )}
                </div>
              </article>
            ))}

            {!loading && !filteredThemes.length ? (
              <div className="rounded-lg border border-dashed bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No themes matched your search/filter selection.
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
