/**
 * File: apps/builder/src/app/themes/versions/[themeVersionId]/page.tsx
 * Module: builder-themes
 * Purpose: Theme version editor route (file tree + code editor + build/install)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import ThemeVersionEditorClient from './theme-version-editor.client';

export default async function ThemeVersionEditorPage({
  params,
}: {
  params: Promise<{ themeVersionId: string }>;
}) {
  const { themeVersionId } = await params;
  return <ThemeVersionEditorClient themeVersionId={themeVersionId} />;
}


