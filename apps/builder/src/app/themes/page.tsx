/**
 * File: apps/builder/src/app/themes/page.tsx
 * Module: builder-themes
 * Purpose: Theme Store page (list themes, seed default, navigate to file editor)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import Link from 'next/link';

export default function ThemesIndex() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Themes</h1>
      <p className="text-gray-600 mt-1">
        Manage theme bundles, edit theme files, build, and preview.
      </p>

      <div className="mt-6 space-y-3">
        <Link
          href="/themes/versions"
          className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white"
        >
          Open Theme Versions
        </Link>

        <div className="text-sm text-gray-500">
          Tip: seed the default theme from API: <code>POST /api/themes/seed/default</code>
        </div>
      </div>
    </div>
  );
}


