/**
 * File: apps/builder/src/app/sites/[siteId]/theme/templates/[...templateId]/template-layout-editor.client.tsx
 * Module: builder-themes
 * Purpose: Edit per-template layout (draft/publish) for a site; drives storefront rendering
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Layout is stored as PageNode root JSON via /api/sites/:siteId/theme/layouts/*
 * - Palette and prop controls are derived from theme manifest sections (with propsSchema)
 */

'use client';

import React, { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getComponent, registerCoreComponents } from '@web-builder/builder-core';
import type { JsonValue, PageContentV1, PageNode } from '@web-builder/contracts';
import { applyEditorAction, type EditorActionEnvelope } from '@web-builder/contracts';
import { apiGet, apiPost, apiPut } from '../../../../../lib/api';

registerCoreComponents();

const initialContent: PageContentV1 = {
  schemaVersion: 1,
  root: { type: 'Container', id: 'root', children: [], props: {} },
};

type ThemeInstall = { draftThemeVersionId?: string | null; publishedThemeVersionId?: string | null };
type ThemeVersion = { id: string; manifest?: any };

export default function TemplateLayoutEditorClient({ siteId, templateId }: { siteId: string; templateId: string }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState<Array<{ type: string; label: string }>>([]);
  const [sectionSchemas, setSectionSchemas] = useState<
    Record<string, { fields: Array<{ type: string; id: string; label: string; default: any; options?: any[]; min?: number; max?: number }> }>
  >({});
  const [themeVersionId, setThemeVersionId] = useState<string | null>(null);
  const [routePathForTemplate, setRoutePathForTemplate] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimerRef = React.useRef<number | null>(null);
  const didLoadInitialRef = React.useRef(false);

  type HistoryState = { past: PageContentV1[]; present: PageContentV1; future: PageContentV1[] };
  type Action =
    | { type: 'SetContent'; content: PageContentV1 }
    | { type: 'InsertNode'; parentId: string; node: PageNode; index?: number }
    | { type: 'UpdateNodeProps'; nodeId: string; patch: Record<string, JsonValue> }
    | { type: 'DeleteNode'; nodeId: string }
    | { type: 'MoveNode'; nodeId: string; newParentId: string; newIndex: number }
    | { type: 'Undo' }
    | { type: 'Redo' };

  const historyReducer = (state: HistoryState, action: Action): HistoryState => {
    const commit = (next: PageContentV1): HistoryState => ({ past: [...state.past, state.present], present: next, future: [] });
    switch (action.type) {
      case 'SetContent':
        return { past: [], present: action.content, future: [] };
      case 'Undo': {
        const prev = state.past[state.past.length - 1];
        if (!prev) return state;
        return { past: state.past.slice(0, -1), present: prev, future: [state.present, ...state.future] };
      }
      case 'Redo': {
        const next = state.future[0];
        if (!next) return state;
        return { past: [...state.past, state.present], present: next, future: state.future.slice(1) };
      }
      case 'InsertNode': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'InsertNode', parentId: action.parentId, index: action.index ?? 999999, node: action.node },
        };
        console.debug('[builder-template-layout] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'UpdateNodeProps': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'UpdateNodeProps', nodeId: action.nodeId, patch: action.patch },
        };
        console.debug('[builder-template-layout] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'DeleteNode': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'DeleteNode', nodeId: action.nodeId },
        };
        console.debug('[builder-template-layout] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'MoveNode': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: { type: 'MoveNode', nodeId: action.nodeId, newParentId: action.newParentId, newIndex: action.newIndex },
        };
        console.debug('[builder-template-layout] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      default:
        return state;
    }
  };

  const [history, dispatch] = useReducer(historyReducer, { past: [], present: initialContent, future: [] });
  const content = history.present;

  const storefrontBase = (process.env.NEXT_PUBLIC_STOREFRONT_URL as string) || 'http://localhost:4201';
  const previewPath = useMemo(() => {
    const p = routePathForTemplate || '/';
    const filled = p.replace(':handle', 'demo-product').replace(':slug', 'about');
    return filled;
  }, [routePathForTemplate]);
  const previewUrl = `${storefrontBase}${previewPath}?previewThemeVersionId=${encodeURIComponent(themeVersionId || '')}`;

  const findNode = (node: PageNode, id: string): PageNode | undefined => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return undefined;
  };

  const defaultPropsForType = (type: string): Record<string, JsonValue> => {
    const schema = sectionSchemas[type];
    if (schema?.fields?.length) {
      const out: Record<string, JsonValue> = {};
      for (const f of schema.fields) {
        if (f?.id) out[String(f.id)] = (f.default ?? '') as JsonValue;
      }
      return out;
    }
    return {};
  };

  const loadThemeMeta = async (installedThemeVersionId: string) => {
    const version = await apiGet<ThemeVersion>(`/api/themes/versions/${installedThemeVersionId}`);
    const sections = version?.manifest?.sections;
    if (Array.isArray(sections)) {
      setPalette(sections.filter((s: any) => s?.type && s?.label).map((s: any) => ({ type: s.type, label: s.label })));
      const schemas: Record<string, any> = {};
      for (const s of sections) {
        if (s?.type && s?.propsSchema?.fields && Array.isArray(s.propsSchema.fields)) {
          schemas[String(s.type)] = { fields: s.propsSchema.fields };
        }
      }
      setSectionSchemas(schemas);
    }
    const routes = version?.manifest?.routes;
    if (Array.isArray(routes)) {
      const match = routes.find((r: any) => r?.template === templateId);
      if (match?.path) setRoutePathForTemplate(String(match.path));
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        console.debug('[builder-template-layout] load', { siteId, templateId });
        const install = await apiGet<ThemeInstall>(`/api/sites/${siteId}/theme`);
        const tv = install?.draftThemeVersionId || install?.publishedThemeVersionId || null;
        setThemeVersionId(tv);
        if (tv) await loadThemeMeta(tv);

        const layouts = await apiGet<any>(`/api/sites/${siteId}/theme/layouts?templateId=${encodeURIComponent(templateId)}`);
        const root = layouts?.draft?.layout || null;
        if (root && typeof root === 'object') {
          dispatch({ type: 'SetContent', content: { schemaVersion: 1, root } });
        } else {
          dispatch({ type: 'SetContent', content: initialContent });
        }
        didLoadInitialRef.current = true;
        setIsDirty(false);
      } catch (e) {
        console.error('[builder-template-layout] load failed', e);
        alert('Failed to load layout');
      } finally {
        setLoading(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, templateId]);

  const saveDraft = async (opts?: { silent?: boolean }) => {
    if (!themeVersionId) return alert('Install a theme first');
    try {
      console.debug('[builder-template-layout] save draft', { siteId, templateId, themeVersionId });
      await apiPut(`/api/sites/${siteId}/theme/layouts/draft`, { themeVersionId, templateId, layout: content.root });
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      if (!opts?.silent) alert('Saved draft layout');
    } catch (e) {
      console.error('[builder-template-layout] save failed', e);
      if (!opts?.silent) alert('Error saving');
    }
  };

  const publish = async () => {
    if (!themeVersionId) return alert('Install a theme first');
    await apiPost(`/api/sites/${siteId}/theme/layouts/publish`, { themeVersionId, templateId });
    alert('Published layout');
  };

  useEffect(() => {
    if (loading) return;
    if (!didLoadInitialRef.current) return;
    if (!isDirty) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDraft({ silent: true });
    }, 1200);
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, content, loading]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const selectedNode = selectedId ? findNode(content.root, selectedId) : undefined;

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
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, data: { parentId } });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
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
          {!node.children?.length && <div className="p-10 text-center text-gray-500">Drop sections here…</div>}
        </div>
      </SortableContext>
    );
  };

  const handleAddSection = (type: string) => {
    const node: PageNode = { type, id: crypto.randomUUID(), props: defaultPropsForType(type) };
    dispatch({ type: 'InsertNode', parentId: selectedId || 'root', node });
    setIsDirty(true);
  };

  const handleUpdateProp = (key: string, value: JsonValue) => {
    if (!selectedId) return;
    dispatch({ type: 'UpdateNodeProps', nodeId: selectedId, patch: { [key]: value } });
    setIsDirty(true);
  };

  const handleDelete = () => {
    if (!selectedId || selectedId === 'root') return;
    dispatch({ type: 'DeleteNode', nodeId: selectedId });
    setSelectedId(undefined);
    setIsDirty(true);
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="flex h-screen">
      <div className="w-72 bg-white border-r p-4">
        <div className="text-sm text-gray-500">Site</div>
        <div className="font-mono text-xs break-all">{siteId}</div>
        <div className="mt-3 text-sm text-gray-500">Template</div>
        <div className="font-mono text-xs break-all">{templateId}</div>

        <div className="mt-4 flex gap-2">
          <Link href={`/themes`} className="px-3 py-2 rounded border text-sm">
            Themes
          </Link>
          <a href={previewUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded border text-sm">
            Preview
          </a>
        </div>

        <div className="mt-4 space-y-2">
          <button onClick={() => saveDraft()} className="w-full p-2 bg-blue-600 text-white rounded">
            Save Draft
          </button>
          <button onClick={publish} className="w-full p-2 bg-indigo-600 text-white rounded">
            Publish Layout
          </button>
        </div>

        <div className="mt-6">
          <div className="font-bold mb-2">Sections</div>
          <div className="space-y-2">
            {palette.map((p) => (
              <button
                key={p.type}
                onClick={() => handleAddSection(p.type)}
                className="w-full p-2 bg-blue-50 hover:bg-blue-100 rounded text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-8 overflow-auto">
        <div className="flex justify-center">
          <div className="bg-white min-h-[500px] shadow-lg w-full max-w-4xl" onClick={() => setSelectedId('root')}>
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
                dispatch({ type: 'MoveNode', nodeId: activeId, newParentId, newIndex: resolvedNewIndex });
                setIsDirty(true);
              }}
            >
              <SortableContainer node={content.root} />
            </DndContext>
          </div>
        </div>
      </div>

      <div className="w-72 bg-white border-l p-4">
        <div className="font-bold mb-2">Properties</div>
        <div className="text-xs text-gray-500 mb-3">
          {isDirty ? 'Unsaved changes (autosave soon)…' : 'All changes saved'}
          {lastSavedAt ? <div className="mt-1">Last save: {new Date(lastSavedAt).toLocaleTimeString()}</div> : null}
          <div className="mt-1">
            History: {history.past.length} undo · {history.future.length} redo
          </div>
          <div className="mt-2 flex gap-2">
            <button
              className="px-2 py-1 text-xs rounded border disabled:opacity-50"
              onClick={() => {
                dispatch({ type: 'Undo' });
                setIsDirty(true);
              }}
              disabled={!history.past.length}
            >
              Undo
            </button>
            <button
              className="px-2 py-1 text-xs rounded border disabled:opacity-50"
              onClick={() => {
                dispatch({ type: 'Redo' });
                setIsDirty(true);
              }}
              disabled={!history.future.length}
            >
              Redo
            </button>
          </div>
        </div>

        {selectedNode ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">Type: {selectedNode.type}</div>
            {sectionSchemas[selectedNode.type]?.fields?.length ? (
              <div className="space-y-4">
                {sectionSchemas[selectedNode.type].fields.map((f) => {
                  const val = (selectedNode.props || {})[f.id] as any;
                  return (
                    <div key={f.id}>
                      <label className="block text-sm font-medium mb-1">{f.label}</label>
                      {f.type === 'color' ? (
                        <input
                          type="color"
                          value={typeof val === 'string' ? val : String(f.default || '#000000')}
                          onChange={(e) => handleUpdateProp(f.id, e.target.value)}
                        />
                      ) : f.type === 'number' ? (
                        <input
                          type="number"
                          value={typeof val === 'number' ? val : Number(f.default || 0)}
                          min={f.min}
                          max={f.max}
                          onChange={(e) => handleUpdateProp(f.id, Number(e.target.value))}
                          className="w-full border p-1 rounded"
                        />
                      ) : f.type === 'select' ? (
                        <select
                          value={typeof val === 'string' ? val : String(f.default || '')}
                          onChange={(e) => handleUpdateProp(f.id, e.target.value)}
                          className="w-full border p-1 rounded"
                        >
                          {(f.options || []).map((o: any) => (
                            <option key={String(o.value)} value={String(o.value)}>
                              {String(o.label)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={typeof val === 'string' ? val : String(f.default || '')}
                          onChange={(e) => handleUpdateProp(f.id, e.target.value)}
                          className="w-full border p-1 rounded"
                        />
                      )}
                      <div className="text-xs text-gray-400 mt-1">id: {f.id}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No schema for this section type.</div>
            )}

            <button
              onClick={handleDelete}
              disabled={!selectedId || selectedId === 'root'}
              className="w-full p-2 bg-red-600 text-white rounded disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
        ) : (
          <div className="text-gray-500">Select a node</div>
        )}
      </div>
    </div>
  );
}

