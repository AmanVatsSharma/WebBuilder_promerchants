/**
 * @file PreviewClient.tsx
 * @module preview
 * @description Client-side preview logic
 * @author BharatERP
 * @created 2025-02-09
 */
'use client';

import React, { useEffect, useState } from 'react';
import { PageRenderer, registerCoreComponents, PageContent } from '@web-builder/builder-core';

registerCoreComponents();

export default function PreviewClient({ pageId }: { pageId: string }) {
  const [content, setContent] = useState<PageContent | null>(null);

  useEffect(() => {
    fetch(`/api/sites/pages/${pageId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.content) setContent({ root: data.content });
      })
      .catch(err => console.error(err));
  }, [pageId]);

  if (!content) return <div>Loading...</div>;

  return <PageRenderer content={content} />;
}

