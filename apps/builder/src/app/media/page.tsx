/**
 * File: apps/builder/src/app/media/page.tsx
 * Module: builder-media
 * Purpose: Simple media manager UI (upload/list) for site assets
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Uses API routes under /api/media/sites/:siteId/*
 * - Provides copyable URLs that themes can use directly
 */

import MediaClient from './media.client';

export default function MediaPage() {
  return <MediaClient />;
}

