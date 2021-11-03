/**
 * @file page.tsx
 * @module preview
 * @description Preview page
 * @author BharatERP
 * @created 2025-02-09
 */
export default function PreviewPage({ params }: { params: { pageId: string } }) {
  return (
    <div>
      <h1>Preview - Page {params.pageId}</h1>
      <p>Content rendering here...</p>
    </div>
  );
}

