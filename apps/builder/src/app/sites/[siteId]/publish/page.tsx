/**
 * @file page.tsx
 * @module builder-publish
 * @description Publish wizard page for a site
 * @author BharatERP
 * @created 2026-01-24
 */

import PublishClient from './publish.client';

export default async function PublishPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return <PublishClient siteId={siteId} />;
}

