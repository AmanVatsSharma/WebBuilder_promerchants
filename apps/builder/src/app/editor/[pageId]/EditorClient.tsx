/**
 * File: apps/builder/src/app/editor/[pageId]/EditorClient.tsx
 * Module: builder-editor
 * Purpose: Client-side editor (WYSIWYG foundations: history, shortcuts, basic DnD reorder)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Currently edits PageContentV1 JSON and persists to /api/sites/pages/:pageId
 * - Implements a basic command/history model for undo/redo and AI-agent readiness
 */
'use client';

import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { getComponent, registerCoreComponents } from '@web-builder/builder-core';
import type { PageContentV1, PageNode, JsonValue } from '@web-builder/contracts';
import { applyEditorAction, type EditorActionEnvelope } from '@web-builder/contracts';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Initialize components
registerCoreComponents();

const initialContent: PageContentV1 = {
  schemaVersion: 1,
  root: {
    type: 'Container',
    id: 'root',
    children: [],
    props: {}
  }
};

export default function EditorClient({ pageId }: { pageId: string }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [palette, setPalette] = useState<Array<{ type: string; label: string }>>([
    { type: 'HeroSection', label: 'Hero Section' },
    { type: 'TextBlock', label: 'Text Block' },
  ]);
  const [isDirty, setIsDirty] = useState(false);
  const didLoadInitialRef = React.useRef(false);
  const autosaveTimerRef = React.useRef<number | null>(null);

  type HistoryState = {
    past: PageContentV1[];
    present: PageContentV1;
    future: PageContentV1[];
  };

  type Action =
    | { type: 'SetContent'; content: PageContentV1 }
    | { type: 'InsertNode'; parentId: string; node: PageNode; index?: number }
    | { type: 'UpdateNodeProps'; nodeId: string; patch: Record<string, JsonValue> }
    | { type: 'DeleteNode'; nodeId: string }
    | { type: 'MoveNode'; nodeId: string; newParentId: string; newIndex: number }
    | { type: 'Undo' }
    | { type: 'Redo' };

  const updateNode = (root: PageNode, id: string, updateFn: (node: PageNode) => PageNode): PageNode => {
    if (root.id === id) return updateFn(root);
    if (!root.children) return root;
    return { ...root, children: root.children.map((c) => updateNode(c, id, updateFn)) };
  };

  const findNode = (node: PageNode, id: string): PageNode | undefined => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return undefined;
  };

  const deleteNode = (node: PageNode, id: string): PageNode => {
    if (!node.children?.length) return node;
    const filtered = node.children.filter((c) => c.id !== id).map((c) => deleteNode(c, id));
    return { ...node, children: filtered };
  };

  const historyReducer = (state: HistoryState, action: Action): HistoryState => {
    const commit = (next: PageContentV1): HistoryState => ({
      past: [...state.past, state.present],
      present: next,
      future: [],
    });

    switch (action.type) {
      case 'SetContent':
        return { past: [], present: action.content, future: [] };
      case 'Undo': {
        const prev = state.past[state.past.length - 1];
        if (!prev) return state;
        return {
          past: state.past.slice(0, -1),
          present: prev,
          future: [state.present, ...state.future],
        };
      }
      case 'Redo': {
        const next = state.future[0];
        if (!next) return state;
        return {
          past: [...state.past, state.present],
          present: next,
          future: state.future.slice(1),
        };
      }
      case 'InsertNode': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'InsertNode', parentId: action.parentId, index: action.index ?? 999999, node: action.node },
        };
        console.debug('[builder-editor] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'UpdateNodeProps': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'UpdateNodeProps', nodeId: action.nodeId, patch: action.patch },
        };
        console.debug('[builder-editor] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'DeleteNode': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'DeleteNode', nodeId: action.nodeId },
        };
        console.debug('[builder-editor] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'MoveNode': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'MoveNode', nodeId: action.nodeId, newParentId: action.newParentId, newIndex: action.newIndex },
        };
        console.debug('[builder-editor] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      default:
        return state;
    }
  };

  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialContent,
    future: [],
  });

  const content = history.present;

  useEffect(() => {
    // Fetch initial data
    console.debug('[builder-editor] loading page', { pageId });
    fetch(`/api/sites/pages/${pageId}`)
      .then(res => {
         if (res.ok) return res.json();
         throw new Error('Failed to load');
      })
      .then(data => {
        if (data && data.content) {
           if (typeof data.siteId === 'string') setSiteId(data.siteId);
           dispatch({ type: 'SetContent', content: { schemaVersion: 1, root: data.content } });
           didLoadInitialRef.current = true;
           setIsDirty(false);
        }
      })
      .catch(err => console.error('[builder-editor] load failed', err))
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    if (!siteId) return;
    // Palette: derive from installed theme manifest.sections (fallback to defaults)
    console.debug('[builder-editor] loading theme palette', { siteId });
    fetch(`/api/sites/${siteId}/theme`)
      .then((r) => (r.ok ? r.json() : null))
      .then((install) => {
        const themeVersionId = install?.draftThemeVersionId || install?.publishedThemeVersionId || null;
        if (!themeVersionId) return null;
        return fetch(`/api/themes/versions/${themeVersionId}`).then((r) => (r.ok ? r.json() : null));
      })
      .then((version) => {
        const sections = version?.manifest?.sections;
        if (Array.isArray(sections) && sections.length) {
          const mapped = sections
            .filter((s: any) => s && typeof s.type === 'string' && typeof s.label === 'string')
            .map((s: any) => ({ type: s.type, label: s.label }));
          if (mapped.length) setPalette(mapped);
        }
      })
      .catch((e) => console.error('[builder-editor] palette load failed', e));
  }, [siteId]);

  const handleAddComponent = (type: string) => {
    console.debug('[builder-editor] add component', { type, selectedId });
    const newComponent: PageNode = {
      type,
      id: crypto.randomUUID(),
      props: (type === 'HeroSection' ? { title: 'New Hero' } : { text: 'New Text' }) as Record<string, JsonValue>
    };
    const targetId = selectedId || 'root';
    dispatch({ type: 'InsertNode', parentId: targetId, node: newComponent });
    setIsDirty(true);
  };

  const handleUpdateProp = (key: string, value: JsonValue) => {
    if (!selectedId) return;
    console.debug('[builder-editor] update prop', { selectedId, key, value });
    dispatch({ type: 'UpdateNodeProps', nodeId: selectedId, patch: { [key]: value } });
    setIsDirty(true);
  };

  const handleDeleteSelected = () => {
    if (!selectedId || selectedId === 'root') return;
    console.debug('[builder-editor] delete node', { selectedId });
    dispatch({ type: 'DeleteNode', nodeId: selectedId });
    setSelectedId(undefined);
    setIsDirty(true);
  };

  const savePage = async (opts?: { silent?: boolean }) => {
    try {
      console.debug('[builder-editor] saving page', { pageId });
      await fetch(`/api/sites/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.root })
      });
      setIsDirty(false);
      if (!opts?.silent) alert('Saved!');
    } catch (e) {
      console.error('[builder-editor] save failed', e);
      if (!opts?.silent) alert('Error saving');
    }
  };

  // Autosave (debounced) after any mutation
  useEffect(() => {
    if (loading) return;
    if (!didLoadInitialRef.current) return;
    if (!isDirty) return;

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      void savePage({ silent: true });
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, content, loading, pageId]);

  const selectedNode = selectedId ? findNode(content.root, selectedId) : undefined;

  // Keyboard shortcuts: undo/redo/delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'Undo' });
        setIsDirty(true);
      } else if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) || (mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        dispatch({ type: 'Redo' });
        setIsDirty(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Avoid deleting while typing in inputs
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const canvasWidth = viewport === 'desktop' ? '100%' : viewport === 'tablet' ? 768 : 375;

  const RenderNode: React.FC<{ node: PageNode }> = ({ node }) => {
    const Comp = getComponent(node.type);
    const isSelected = selectedId === node.id;
    const style = isSelected ? { outline: '2px solid #2563eb' } : undefined;
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(node.id);
        }}
        style={style}
        className="relative"
      >
        {node.type === 'Container' ? (
          <div className="min-h-[40px]">
            <SortableContainer node={node} />
          </div>
        ) : Comp ? (
          // eslint-disable-next-line react/jsx-props-no-spreading
          <Comp {...(node.props || {})} />
        ) : (
          <div className="p-3 border border-red-400 text-red-700">Unknown component: {node.type}</div>
        )}
      </div>
    );
  };

  const SortableBlock: React.FC<{ node: PageNode; parentId: string }> = ({ node, parentId }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: node.id,
      data: { parentId },
    });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };
    return (
      <div ref={setNodeRef} style={style} className="relative">
        <div
          className="absolute left-2 top-2 z-20 bg-white/90 border rounded px-2 py-1 text-xs cursor-grab select-none"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          Drag
        </div>
        <RenderNode node={node} />
      </div>
    );
  };

  const SortableContainer: React.FC<{ node: PageNode }> = ({ node }) => {
    if (node.type !== 'Container') return <RenderNode node={node} />;
    const items = (node.children || []).map((c) => c.id);
    return (
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="p-2">
          {(node.children || []).map((child) => (
            <SortableBlock key={child.id} node={child} parentId={node.id} />
          ))}
          {!node.children?.length && (
            <div className="p-10 text-center text-gray-500">Drop components here…</div>
          )}
        </div>
      </SortableContext>
    );
  };

  if (loading) return <div>Loading page...</div>;

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r p-4">
        <h2 className="font-bold mb-4">Components</h2>
        <div className="space-y-2">
          {palette.map((p) => (
            <button
              key={p.type}
              onClick={() => handleAddComponent(p.type)}
              className="w-full p-2 bg-blue-100 hover:bg-blue-200 rounded text-left"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-8">
           <button onClick={savePage} className="w-full p-2 bg-green-600 text-white rounded">
             Save Page
           </button>
        </div>
        <div className="mt-3">
          <button
            onClick={handleDeleteSelected}
            className="w-full p-2 bg-red-600 text-white rounded disabled:opacity-50"
            disabled={!selectedId || selectedId === 'root'}
          >
            Delete Selected
          </button>
        </div>
        <div className="mt-6">
          <h3 className="font-bold mb-2">Viewport</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-2 rounded border ${viewport === 'desktop' ? 'bg-blue-100' : ''}`}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-2 rounded border ${viewport === 'tablet' ? 'bg-blue-100' : ''}`}
            >
              Tablet
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-2 rounded border ${viewport === 'mobile' ? 'bg-blue-100' : ''}`}
            >
              Mobile
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Undo: Ctrl/Cmd+Z · Redo: Ctrl/Cmd+Shift+Z · Delete: Del
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 p-8 overflow-auto">
        <div className="flex justify-center">
          <div
            className="bg-white min-h-[500px] shadow-lg w-full"
            style={{ maxWidth: typeof canvasWidth === 'number' ? `${canvasWidth}px` : canvasWidth }}
            onClick={() => setSelectedId('root')}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const activeId = String(event.active.id);
                const overId = event.over ? String(event.over.id) : null;
                if (!overId || activeId === overId) return;

                const activeParentId = (event.active.data.current as any)?.parentId as string | undefined;
                const overParentId = (event.over?.data.current as any)?.parentId as string | undefined;
                const newParentId = overParentId || activeParentId || 'root';

                const parentNode = findNode(content.root, newParentId);
                const siblings = parentNode?.children || [];
                const oldIndex = siblings.findIndex((c) => c.id === activeId);
                const newIndex = siblings.findIndex((c) => c.id === overId);
                const resolvedNewIndex = newIndex === -1 ? siblings.length : newIndex;

                console.debug('[builder-editor] move node', { activeId, overId, activeParentId, overParentId, newParentId, oldIndex, resolvedNewIndex });
                dispatch({ type: 'MoveNode', nodeId: activeId, newParentId, newIndex: resolvedNewIndex });
                setIsDirty(true);
              }}
            >
              <SortableContainer node={content.root} />
            </DndContext>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-64 bg-white border-l p-4">
        <h2 className="font-bold mb-4">Properties</h2>
        <div className="text-xs text-gray-500 mb-3">
          {isDirty ? 'Unsaved changes (autosave soon)…' : 'All changes saved'}
        </div>
        {selectedNode ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">ID: {selectedNode.id}</div>
            <div className="text-sm text-gray-500 mb-2">Type: {selectedNode.type}</div>
            {Object.entries(selectedNode.props || {}).map(([key, val]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{key}</label>
                <input 
                  type="text" 
                  value={String(val ?? '')}
                  onChange={(e) => handleUpdateProp(key, e.target.value)}
                  className="w-full border p-1 rounded"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Select a component</p>
        )}
      </div>
    </div>
  );
}

