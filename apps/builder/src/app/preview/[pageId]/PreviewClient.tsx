/**
 * File: apps/builder/src/app/preview/[pageId]/PreviewClient.tsx
 * Module: builder-preview
 * Purpose: Client-side page preview (renders PageContentV1)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Uses same renderer as editor, but without selection/edit overlays
 */
'use client';

import React, { useEffect, useState } from 'react';
import { PageRenderer, registerCoreComponents } from '@web-builder/builder-core';
import type { PageContentV1 } from '@web-builder/contracts';

registerCoreComponents();

export default function PreviewClient({ pageId }: { pageId: string }) {
  const [content, setContent] = useState<PageContentV1 | null>(null);

  useEffect(() => {
    console.debug('[builder-preview] loading page', { pageId });
    fetch(`/api/sites/pages/${pageId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.content) setContent({ schemaVersion: 1, root: data.content });
      })
      .catch(err => console.error('[builder-preview] load failed', err));
  }, [pageId]);

  if (!content) return <div>Loading...</div>;

  return <PageRenderer content={content} />;
}

