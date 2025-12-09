/**
 * @file page.tsx
 * @module preview
 * @description Preview page
 * @author BharatERP
 * @created 2025-02-09
 */
import PreviewClient from './PreviewClient';

export default async function PreviewPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  return <PreviewClient pageId={pageId} />;
}
