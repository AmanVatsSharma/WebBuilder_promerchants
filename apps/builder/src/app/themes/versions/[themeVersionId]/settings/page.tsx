/**
 * File: apps/builder/src/app/themes/versions/[themeVersionId]/settings/page.tsx
 * Module: builder-themes
 * Purpose: Theme settings editor route (schema-driven)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import ThemeSettingsClient from './theme-settings.client';

export default async function ThemeSettingsPage({
  params,
}: {
  params: Promise<{ themeVersionId: string }>;
}) {
  const { themeVersionId } = await params;
  return <ThemeSettingsClient themeVersionId={themeVersionId} />;
}

