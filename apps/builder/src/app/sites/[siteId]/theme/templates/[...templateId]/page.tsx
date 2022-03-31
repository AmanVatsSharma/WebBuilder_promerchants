/**
 * File: apps/builder/src/app/sites/[siteId]/theme/templates/[...templateId]/page.tsx
 * Module: builder-themes
 * Purpose: Template layout editor route (per-site, per-template)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import TemplateLayoutEditorClient from './template-layout-editor.client';

export default async function TemplateLayoutEditorPage({
  params,
}: {
  params: Promise<{ siteId: string; templateId: string[] }>;
}) {
  const { siteId, templateId } = await params;
  const templateIdJoined = templateId.join('/');
  return <TemplateLayoutEditorClient siteId={siteId} templateId={templateIdJoined} />;
}

