/**
 * @file page.tsx
 * @module editor
 * @description Main editor page
 * @author BharatERP
 * @created 2025-02-09
 */
export default function EditorPage({ params }: { params: { pageId: string } }) {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl">Editor - Page {params.pageId}</h1>
      </header>
      <main className="flex-1 bg-gray-100 p-8">
        <p>Editor Interface loading...</p>
      </main>
    </div>
  );
}

