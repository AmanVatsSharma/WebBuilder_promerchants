/**
 * @file page.tsx
 * @module editor
 * @description Main editor page
 * @author BharatERP
 * @created 2025-02-09
 */
import EditorClient from './EditorClient';

export default async function EditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl">Editor - Page {pageId}</h1>
      </header>
      <main className="flex-1 bg-gray-100 overflow-hidden">
        <EditorClient pageId={pageId} />
      </main>
    </div>
  );
}
