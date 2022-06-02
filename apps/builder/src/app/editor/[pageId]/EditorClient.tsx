/**
 * File: apps/builder/src/app/editor/[pageId]/EditorClient.tsx
 * Module: builder-editor
 * Purpose: Powerful page editor with layers, multi-select, shortcuts, and live preview
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 * Notes:
 * - Uses PageContentV1 commands for deterministic undo/redo history.
 * - Supports schema-driven props plus viewport-aware visual styles.
 */
'use client';

import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  getComponent,
  PageRenderer,
  registerComponent,
  registerCoreComponents,
} from '@web-builder/builder-core';
import type { JsonValue, PageContentV1, PageNode } from '@web-builder/contracts';
import { applyEditorAction, type EditorActionEnvelope } from '@web-builder/contracts';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiGet, apiPut } from '../../lib/api';
import { MediaPickerModal } from '../../app/media/media-picker-modal.client';

registerCoreComponents();

type Viewport = 'desktop' | 'tablet' | 'mobile';
type LayerRow = { id: string; type: string; depth: number; label: string };
type JsonRecord = Record<string, JsonValue>;
type SchemaField = {
  type: string;
  id: string;
  label: string;
  default: any;
  options?: any[];
  min?: number;
  max?: number;
};

const coreSectionSchemas: Record<string, { fields: SchemaField[] }> = {
  HeroSection: {
    fields: [
      { type: 'text', id: 'title', label: 'Title', default: 'Build. Publish. Sell.' },
      {
        type: 'text',
        id: 'subtitle',
        label: 'Subtitle',
        default: 'This is your next high-converting hero section.',
      },
      { type: 'media', id: 'backgroundImageUrl', label: 'Background image', default: '' },
    ],
  },
  TextBlock: {
    fields: [{ type: 'text', id: 'text', label: 'Text', default: 'Write clear copy that converts.' }],
  },
  RichTextBlock: {
    fields: [
      {
        type: 'text',
        id: 'html',
        label: 'HTML',
        default: '<p>Use rich text to shape tone and hierarchy.</p>',
      },
    ],
  },
  ButtonBlock: {
    fields: [
      { type: 'text', id: 'label', label: 'Label', default: 'Shop now' },
      { type: 'text', id: 'href', label: 'Link', default: '/products' },
    ],
  },
  ImageBlock: {
    fields: [
      { type: 'media', id: 'src', label: 'Image URL', default: '' },
      { type: 'text', id: 'alt', label: 'Alt text', default: 'Image' },
    ],
  },
  GridSection: {
    fields: [
      { type: 'number', id: 'columns', label: 'Columns', default: 3, min: 1, max: 6 },
      { type: 'number', id: 'gap', label: 'Gap', default: 16, min: 0, max: 80 },
    ],
  },
  FormBlock: {
    fields: [
      { type: 'text', id: 'title', label: 'Title', default: 'Get in touch' },
      { type: 'text', id: 'buttonLabel', label: 'Button label', default: 'Submit' },
    ],
  },
  TestimonialSection: {
    fields: [
      {
        type: 'text',
        id: 'quote',
        label: 'Quote',
        default: 'This builder helped us launch twice as fast.',
      },
      { type: 'text', id: 'author', label: 'Author', default: 'Happy Merchant' },
      { type: 'text', id: 'role', label: 'Role', default: 'Founder' },
    ],
  },
  ProductListSection: {
    fields: [
      { type: 'text', id: 'title', label: 'Title', default: 'Featured Products' },
      { type: 'number', id: 'count', label: 'Product count', default: 4, min: 1, max: 12 },
    ],
  },
  CtaBannerSection: {
    fields: [
      { type: 'text', id: 'title', label: 'Title', default: 'Ready to launch your store?' },
      {
        type: 'text',
        id: 'subtitle',
        label: 'Subtitle',
        default: 'Start today and go live with confidence.',
      },
      { type: 'text', id: 'buttonLabel', label: 'Button label', default: 'Start free' },
      { type: 'text', id: 'buttonHref', label: 'Button href', default: '#' },
    ],
  },
  FaqSection: {
    fields: [
      { type: 'text', id: 'title', label: 'Title', default: 'Frequently Asked Questions' },
      {
        type: 'text',
        id: 'items',
        label: 'FAQ JSON',
        default:
          '[{"q":"How quickly can I launch?","a":"Usually in a few hours."},{"q":"Is this customizable?","a":"Yes, deeply and visually."}]',
      },
    ],
  },
  NavbarSection: {
    fields: [
      { type: 'text', id: 'brandName', label: 'Brand name', default: 'WebBuilder' },
      {
        type: 'text',
        id: 'links',
        label: 'Links JSON',
        default:
          '[{"label":"Home","href":"/"},{"label":"Products","href":"/products"},{"label":"Contact","href":"/contact"}]',
      },
    ],
  },
  FooterSection: {
    fields: [
      { type: 'text', id: 'text', label: 'Footer text', default: 'Powered by WebBuilder' },
    ],
  },
};

const initialContent: PageContentV1 = {
  schemaVersion: 1,
  root: {
    type: 'Container',
    id: 'root',
    children: [],
    props: {},
  },
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneNodeWithNewIds(node: PageNode): PageNode {
  return {
    ...node,
    id: crypto.randomUUID(),
    props: node.props ? ({ ...node.props } as JsonRecord) : {},
    children: (node.children || []).map(cloneNodeWithNewIds),
  };
}

function flattenLayers(node: PageNode, depth = 0): LayerRow[] {
  const labelFromProps =
    (node.props && typeof node.props.__label === 'string'
      ? node.props.__label
      : undefined) ||
    (node.props && typeof node.props.title === 'string'
      ? node.props.title
      : undefined) ||
    (node.props && typeof node.props.text === 'string' ? node.props.text : undefined);

  const label =
    typeof labelFromProps === 'string' && labelFromProps.trim()
      ? labelFromProps.trim().slice(0, 42)
      : node.type;

  const rows: LayerRow[] = [{ id: node.id, type: node.type, depth, label }];
  for (const child of node.children || []) {
    rows.push(...flattenLayers(child, depth + 1));
  }
  return rows;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const tag = (target as HTMLElement | null)?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function toStyleValueNumber(input: string): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

function viewportAwareProps(
  props: Record<string, JsonValue> | undefined,
  viewport: Viewport,
): Record<string, JsonValue> {
  const base = isJsonRecord(props) ? ({ ...props } as JsonRecord) : {};
  const style = isJsonRecord(base.style)
    ? ({ ...base.style } as JsonRecord)
    : {};
  const byViewport = isJsonRecord(base.styleByViewport)
    ? ({ ...base.styleByViewport } as JsonRecord)
    : {};
  const viewportStyleRaw = byViewport[viewport];
  const viewportStyle = isJsonRecord(viewportStyleRaw)
    ? ({ ...viewportStyleRaw } as JsonRecord)
    : {};
  return {
    ...base,
    style: { ...style, ...viewportStyle },
  };
}

export default function EditorClient({ pageId }: { pageId: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [styleTargetViewport, setStyleTargetViewport] = useState<Viewport>('desktop');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [layerQuery, setLayerQuery] = useState('');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [clipboardNode, setClipboardNode] = useState<PageNode | null>(null);

  const [palette, setPalette] = useState<Array<{ type: string; label: string }>>([
    { type: 'HeroSection', label: 'Hero Section' },
    { type: 'TextBlock', label: 'Text Block' },
    { type: 'RichTextBlock', label: 'Rich Text' },
    { type: 'ButtonBlock', label: 'Button' },
    { type: 'ImageBlock', label: 'Image' },
    { type: 'GridSection', label: 'Grid' },
    { type: 'FormBlock', label: 'Form' },
    { type: 'TestimonialSection', label: 'Testimonial' },
    { type: 'ProductListSection', label: 'Product List' },
    { type: 'CtaBannerSection', label: 'CTA Banner' },
    { type: 'FaqSection', label: 'FAQ' },
    { type: 'NavbarSection', label: 'Navbar' },
    { type: 'FooterSection', label: 'Footer' },
  ]);

  const [sectionSchemas, setSectionSchemas] = useState<
    Record<string, { fields: SchemaField[] }>
  >(coreSectionSchemas);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaTargetKey, setMediaTargetKey] = useState<string | null>(null);
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

  const findNode = (node: PageNode, id: string): PageNode | undefined => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return undefined;
  };

  const findParentAndIndex = (
    node: PageNode,
    targetId: string,
    parentId?: string,
  ): { parentId: string; index: number } | null => {
    const kids = node.children || [];
    const idx = kids.findIndex((k) => k.id === targetId);
    if (idx !== -1) {
      return { parentId: parentId || node.id, index: idx };
    }
    for (const child of kids) {
      const found = findParentAndIndex(child, targetId, node.id);
      if (found) return found;
    }
    return null;
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
          action: {
            type: 'InsertNode',
            parentId: action.parentId,
            index: action.index ?? 999999,
            node: action.node,
          },
        };
        console.debug('[builder-editor] action', envelope);
        return commit(applyEditorAction(state.present, envelope.action));
      }
      case 'UpdateNodeProps': {
        const envelope: EditorActionEnvelope = {
          id: crypto.randomUUID(),
          actor: 'user:local',
          createdAt: new Date().toISOString(),
          action: {
            type: 'UpdateNodeProps',
            nodeId: action.nodeId,
            patch: action.patch,
          },
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
          action: {
            type: 'MoveNode',
            nodeId: action.nodeId,
            newParentId: action.newParentId,
            newIndex: action.newIndex,
          },
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
  const selectedId = selectedIds[0];
  const selectedNode = selectedId ? findNode(content.root, selectedId) : undefined;

  const layerRows = useMemo(
    () =>
      flattenLayers(content.root).filter((row) => {
        if (!layerQuery.trim()) return true;
        const q = layerQuery.trim().toLowerCase();
        return (
          row.type.toLowerCase().includes(q) ||
          row.id.toLowerCase().includes(q) ||
          row.label.toLowerCase().includes(q)
        );
      }),
    [content.root, layerQuery],
  );

  const selectedCount = selectedIds.length;

  const selectNode = (nodeId: string, additive = false) => {
    if (!additive) {
      setSelectedIds([nodeId]);
      return;
    }
    setSelectedIds((prev) => {
      const exists = prev.includes(nodeId);
      if (exists) {
        const next = prev.filter((id) => id !== nodeId);
        return next.length ? next : [];
      }
      return [nodeId, ...prev];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  useEffect(() => {
    console.debug('[builder-editor] loading page', { pageId });
    (async () => {
      try {
        const data = await apiGet<{ siteId: string; content: any }>(
          `/api/sites/pages/${pageId}`,
        );
        if (data && data.content) {
          if (typeof data.siteId === 'string') setSiteId(data.siteId);
          dispatch({
            type: 'SetContent',
            content: { schemaVersion: 1, root: data.content },
          });
          didLoadInitialRef.current = true;
          setIsDirty(false);
          setSelectedIds(['root']);
        }
      } catch (err) {
        console.error('[builder-editor] load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  useEffect(() => {
    if (!siteId) return;
    console.debug('[builder-editor] loading theme palette', { siteId });
    (async () => {
      try {
        const install = await apiGet<any>(`/api/sites/${siteId}/theme`);
        const themeVersionId =
          install?.draftThemeVersionId || install?.publishedThemeVersionId || null;
        const schemas: Record<string, { fields: SchemaField[] }> = {};
        const paletteItems: Array<{ type: string; label: string }> = [...palette];

        if (themeVersionId) {
          const version = await apiGet<any>(`/api/themes/versions/${themeVersionId}`);
          const sections = version?.manifest?.sections;
          if (Array.isArray(sections) && sections.length) {
            const mapped = sections
              .filter(
                (s: any) =>
                  s && typeof s.type === 'string' && typeof s.label === 'string',
              )
              .map((s: any) => ({ type: s.type as string, label: s.label as string }));
            paletteItems.push(...mapped);

            for (const s of sections) {
              if (
                s?.type &&
                s?.propsSchema?.fields &&
                Array.isArray(s.propsSchema.fields)
              ) {
                schemas[String(s.type)] = { fields: s.propsSchema.fields as SchemaField[] };
              }
            }
          }
        }

        try {
          const extBlocks = await apiGet<any[]>(
            `/api/sites/${siteId}/extensions/blocks`,
          );
          if (Array.isArray(extBlocks) && extBlocks.length) {
            paletteItems.push(
              ...extBlocks
                .filter(
                  (b) =>
                    b && typeof b.type === 'string' && typeof b.label === 'string',
                )
                .map((b) => ({ type: String(b.type), label: String(b.label) })),
            );

            for (const b of extBlocks) {
              if (
                b?.type &&
                b?.propsSchema?.fields &&
                Array.isArray(b.propsSchema.fields)
              ) {
                schemas[String(b.type)] = { fields: b.propsSchema.fields as SchemaField[] };
              }
            }

            for (const b of extBlocks) {
              if (!b?.type || typeof b.type !== 'string') continue;
              const type = String(b.type);
              const label = typeof b.label === 'string' ? b.label : type;
              registerComponent(type, (props: any) => (
                <div className="border border-dashed border-gray-300 rounded p-4 bg-white">
                  <div className="text-xs text-gray-500">App Block</div>
                  <div className="font-semibold">{label}</div>
                  <div className="text-xs text-gray-400 mt-1 font-mono break-all">
                    {type}
                  </div>
                  {props && Object.keys(props).length ? (
                    <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-auto">
                      {JSON.stringify(props, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-xs text-gray-500 mt-2">No props</div>
                  )}
                </div>
              ));
            }
          }
        } catch (e) {
          console.debug('[builder-editor] extension blocks not available', e);
        }

        const deduped = Array.from(
          new Map(paletteItems.map((p) => [p.type, p])).values(),
        );
        setPalette(deduped);
        setSectionSchemas((prev) => ({ ...prev, ...schemas }));
      } catch (e) {
        console.error('[builder-editor] palette load failed', e);
      }
    })();
  }, [siteId]);

  const defaultPropsForType = (type: string): Record<string, JsonValue> => {
    const schema = sectionSchemas[type];
    if (schema?.fields?.length) {
      const out: Record<string, JsonValue> = {};
      for (const f of schema.fields) {
        if (f?.id) out[String(f.id)] = (f.default ?? '') as JsonValue;
      }
      return out;
    }

    if (type === 'HeroSection') {
      return {
        title: 'Build. Publish. Sell.',
        subtitle: 'This is your next high-converting hero section.',
      };
    }
    if (type === 'TextBlock' || type === 'RichTextBlock') {
      return { text: 'Write content that converts and inspires.' };
    }
    if (type === 'ButtonBlock') return { label: 'Shop now', href: '/products' };
    if (type === 'ImageBlock')
      return {
        src: 'https://picsum.photos/seed/webbuilder/1280/720',
        alt: 'Banner image',
      };
    if (type === 'FaqSection') {
      return {
        items:
          '[{"q":"How fast can I launch?","a":"Usually in one day."},{"q":"Can I customize everything?","a":"Yes, deeply."}]',
      };
    }
    if (type === 'Container' || type === 'GridSection' || type === 'ProductListSection') {
      return {};
    }
    return {};
  };

  const resolveInsertParentId = (currentSelectedId?: string) => {
    if (!currentSelectedId) return 'root';
    const selected = findNode(content.root, currentSelectedId);
    if (selected?.type === 'Container') return currentSelectedId;
    const parentInfo = findParentAndIndex(content.root, currentSelectedId);
    return parentInfo?.parentId || 'root';
  };

  const handleAddComponent = (type: string) => {
    const targetParentId = resolveInsertParentId(selectedId);
    const newComponent: PageNode = {
      type,
      id: crypto.randomUUID(),
      props: defaultPropsForType(type),
    };
    dispatch({
      type: 'InsertNode',
      parentId: targetParentId,
      node: newComponent,
    });
    setSelectedIds([newComponent.id]);
    setIsDirty(true);
  };

  const handleUpdateProp = (key: string, value: JsonValue) => {
    if (!selectedId) return;
    dispatch({
      type: 'UpdateNodeProps',
      nodeId: selectedId,
      patch: { [key]: value },
    });
    setIsDirty(true);
  };

  const updateVisualStyle = (key: string, value: JsonValue) => {
    if (!selectedNode) return;
    const props = isJsonRecord(selectedNode.props)
      ? ({ ...selectedNode.props } as JsonRecord)
      : {};

    if (styleTargetViewport === 'desktop') {
      const style = isJsonRecord(props.style) ? ({ ...props.style } as JsonRecord) : {};
      style[key] = value;
      handleUpdateProp('style', style);
      return;
    }

    const byViewport = isJsonRecord(props.styleByViewport)
      ? ({ ...props.styleByViewport } as JsonRecord)
      : {};
    const currentViewportStyle = isJsonRecord(byViewport[styleTargetViewport])
      ? ({ ...(byViewport[styleTargetViewport] as JsonRecord) } as JsonRecord)
      : {};
    currentViewportStyle[key] = value;
    byViewport[styleTargetViewport] = currentViewportStyle;
    handleUpdateProp('styleByViewport', byViewport);
  };

  const getVisualStyleValue = (key: string): JsonValue | '' => {
    if (!selectedNode || !isJsonRecord(selectedNode.props)) return '';
    if (styleTargetViewport === 'desktop') {
      const style = isJsonRecord(selectedNode.props.style)
        ? (selectedNode.props.style as JsonRecord)
        : {};
      return style[key] ?? '';
    }
    const byViewport = isJsonRecord(selectedNode.props.styleByViewport)
      ? (selectedNode.props.styleByViewport as JsonRecord)
      : {};
    const viewportStyle = isJsonRecord(byViewport[styleTargetViewport])
      ? (byViewport[styleTargetViewport] as JsonRecord)
      : {};
    return viewportStyle[key] ?? '';
  };

  const openMediaPickerFor = (propKey: string) => {
    if (!siteId) return alert('Missing siteId (save/load page first)');
    if (!selectedId) return alert('Select a component first');
    setMediaTargetKey(propKey);
    setMediaPickerOpen(true);
  };

  const handleDeleteSelected = () => {
    const targets = selectedIds.filter((id) => id !== 'root');
    if (!targets.length) return;
    for (const nodeId of targets) {
      dispatch({ type: 'DeleteNode', nodeId });
    }
    setSelectedIds(['root']);
    setIsDirty(true);
  };

  const handleCopySelected = () => {
    if (!selectedNode || selectedNode.id === 'root') return;
    const cloned = JSON.parse(JSON.stringify(selectedNode)) as PageNode;
    setClipboardNode(cloned);
  };

  const handlePasteClipboard = () => {
    if (!clipboardNode) return;
    const clone = cloneNodeWithNewIds(clipboardNode);
    const parentId = resolveInsertParentId(selectedId);
    dispatch({
      type: 'InsertNode',
      parentId,
      node: clone,
    });
    setSelectedIds([clone.id]);
    setIsDirty(true);
  };

  const handleDuplicateSelected = () => {
    const targets = selectedIds.filter((id) => id !== 'root');
    if (!targets.length) return;
    for (const nodeId of targets) {
      const source = findNode(content.root, nodeId);
      const parentInfo = findParentAndIndex(content.root, nodeId);
      if (!source || !parentInfo) continue;
      const duplicate = cloneNodeWithNewIds(source);
      dispatch({
        type: 'InsertNode',
        parentId: parentInfo.parentId,
        node: duplicate,
        index: parentInfo.index + 1,
      });
    }
    setIsDirty(true);
  };

  const savePage = async (opts?: { silent?: boolean }) => {
    try {
      await apiPut(`/api/sites/pages/${pageId}`, { content: content.root });
      setIsDirty(false);
      setLastSavedAt(new Date().toISOString());
      if (!opts?.silent) alert('Saved');
    } catch (e) {
      console.error('[builder-editor] save failed', e);
      if (!opts?.silent) alert('Error saving page');
    }
  };

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
  }, [isDirty, content, loading, pageId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (isTypingTarget(e.target)) return;

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'Undo' });
        setIsDirty(true);
        return;
      }
      if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) || (mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        dispatch({ type: 'Redo' });
        setIsDirty(true);
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteClipboard();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIds, selectedNode, clipboardNode, content.root]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const canvasWidth =
    viewport === 'desktop' ? '100%' : viewport === 'tablet' ? 768 : 375;

  const RenderNode: React.FC<{ node: PageNode }> = ({ node }) => {
    const Comp = getComponent(node.type);
    const isSelected = selectedIds.includes(node.id);
    const style = isSelected
      ? {
          outline: selectedId === node.id ? '2px solid #2563eb' : '2px dashed #93c5fd',
        }
      : undefined;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          const additive = e.shiftKey || e.metaKey || e.ctrlKey;
          selectNode(node.id, additive);
        }}
        style={style}
        className="relative"
      >
        {node.type === 'Container' ? (
          <div className="min-h-[40px]">
            <SortableContainer node={node} />
          </div>
        ) : Comp ? (
          <Comp {...viewportAwareProps(node.props || {}, viewport)} />
        ) : (
          <div className="p-3 border border-red-400 text-red-700 rounded">
            Unknown component: {node.type}
          </div>
        )}
      </div>
    );
  };

  const SortableBlock: React.FC<{ node: PageNode; parentId: string }> = ({
    node,
    parentId,
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({
        id: node.id,
        data: { parentId, nodeType: node.type },
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
            <div className="p-10 text-center text-gray-500">Drop components here...</div>
          )}
        </div>
      </SortableContext>
    );
  };

  if (loading) return <div>Loading page...</div>;

  return (
    <div className="flex h-full">
      {siteId && mediaTargetKey ? (
        <MediaPickerModal
          siteId={siteId}
          isOpen={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onPickUrl={(url) => handleUpdateProp(mediaTargetKey, url)}
        />
      ) : null}

      <aside className="w-80 bg-white border-r p-4 overflow-auto">
        <h2 className="font-bold mb-4">Components</h2>
        <div className="space-y-2">
          {palette.map((p) => (
            <button
              key={p.type}
              onClick={() => handleAddComponent(p.type)}
              className="w-full p-2 bg-blue-100 hover:bg-blue-200 rounded text-left text-sm"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => void savePage()}
            className="p-2 bg-green-600 text-white rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setShowLivePreview((v) => !v)}
            className="p-2 border rounded text-sm"
          >
            {showLivePreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={handleCopySelected}
            className="p-2 border rounded text-xs disabled:opacity-50"
            disabled={!selectedNode || selectedNode.id === 'root'}
          >
            Copy
          </button>
          <button
            onClick={handlePasteClipboard}
            className="p-2 border rounded text-xs disabled:opacity-50"
            disabled={!clipboardNode}
          >
            Paste
          </button>
          <button
            onClick={handleDuplicateSelected}
            className="p-2 border rounded text-xs disabled:opacity-50"
            disabled={selectedCount === 0}
          >
            Duplicate
          </button>
          <button
            onClick={handleDeleteSelected}
            className="p-2 bg-red-600 text-white rounded text-xs disabled:opacity-50"
            disabled={!selectedIds.some((id) => id !== 'root')}
          >
            Delete
          </button>
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-2">Layers</h3>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Search layers..."
            value={layerQuery}
            onChange={(e) => setLayerQuery(e.target.value)}
          />
          <div className="mt-2 max-h-60 overflow-auto border rounded">
            {layerRows.map((row) => {
              const isSelected = selectedIds.includes(row.id);
              return (
                <button
                  key={row.id}
                  onClick={(e) => {
                    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
                    selectNode(row.id, additive);
                  }}
                  className={`w-full text-left px-2 py-1 text-xs border-b last:border-b-0 ${
                    isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                  style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                >
                  <span className="font-mono text-gray-500">{row.type}</span>{' '}
                  <span className="text-gray-700">{row.label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {selectedCount} selected · Shift/Ctrl/Cmd+Click for multi-select
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-2">Viewport</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-2 rounded border text-xs ${
                viewport === 'desktop' ? 'bg-blue-100' : ''
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-2 rounded border text-xs ${
                viewport === 'tablet' ? 'bg-blue-100' : ''
              }`}
            >
              Tablet
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-2 rounded border text-xs ${
                viewport === 'mobile' ? 'bg-blue-100' : ''
              }`}
            >
              Mobile
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Undo: Ctrl/Cmd+Z · Copy: Ctrl/Cmd+C · Paste: Ctrl/Cmd+V
          </div>
        </div>
      </aside>

      <section className="flex-1 bg-gray-50 p-4 overflow-auto">
        <div className={`grid gap-4 ${showLivePreview ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">Editable Canvas</div>
            <div className="flex justify-center">
              <div
                className="bg-white min-h-[560px] shadow-lg w-full border"
                style={{
                  maxWidth:
                    typeof canvasWidth === 'number' ? `${canvasWidth}px` : canvasWidth,
                }}
                onClick={() => selectNode('root', false)}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const activeId = String(event.active.id);
                    const overId = event.over ? String(event.over.id) : null;
                    if (!overId || activeId === overId) return;

                    const activeParentId = (event.active.data.current as any)?.parentId as
                      | string
                      | undefined;
                    const overNode = findNode(content.root, overId);
                    let newParentId = activeParentId || 'root';
                    let resolvedNewIndex = 0;

                    if (overNode?.type === 'Container') {
                      newParentId = overNode.id;
                      resolvedNewIndex = (overNode.children || []).length;
                    } else {
                      const overParentId =
                        (event.over?.data.current as any)?.parentId ||
                        findParentAndIndex(content.root, overId)?.parentId;
                      newParentId = overParentId || 'root';
                      const siblings = findNode(content.root, newParentId)?.children || [];
                      const newIndex = siblings.findIndex((c) => c.id === overId);
                      resolvedNewIndex = newIndex === -1 ? siblings.length : newIndex;
                    }

                    dispatch({
                      type: 'MoveNode',
                      nodeId: activeId,
                      newParentId,
                      newIndex: resolvedNewIndex,
                    });
                    setIsDirty(true);
                  }}
                >
                  <SortableContainer node={content.root} />
                </DndContext>
              </div>
            </div>
          </div>

          {showLivePreview ? (
            <div className="bg-white border rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-2">Live Preview</div>
              <div className="flex justify-center">
                <div
                  className="bg-white min-h-[560px] shadow-lg w-full border"
                  style={{
                    maxWidth:
                      typeof canvasWidth === 'number' ? `${canvasWidth}px` : canvasWidth,
                  }}
                >
                  <PageRenderer content={content} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="w-80 bg-white border-l p-4 overflow-auto">
        <h2 className="font-bold mb-4">Properties</h2>
        <div className="text-xs text-gray-500 mb-3">
          {isDirty ? 'Unsaved changes (autosave soon)...' : 'All changes saved'}
          {lastSavedAt ? (
            <div className="mt-1">
              Last save: {new Date(lastSavedAt).toLocaleTimeString()}
            </div>
          ) : null}
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
          <div className="space-y-5">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">ID: {selectedNode.id}</div>
              <div className="text-sm text-gray-500">Type: {selectedNode.type}</div>
              <div className="text-sm">
                <label className="block text-xs text-gray-600 mb-1">Layer Name</label>
                <input
                  type="text"
                  value={
                    typeof selectedNode.props?.__label === 'string'
                      ? selectedNode.props.__label
                      : ''
                  }
                  onChange={(e) => handleUpdateProp('__label', e.target.value)}
                  className="w-full border p-1 rounded text-sm"
                  placeholder="Optional alias for layer tree"
                />
              </div>
            </div>

            {sectionSchemas[selectedNode.type]?.fields?.length ? (
              <div className="space-y-4">
                <div className="font-semibold text-sm">Schema Fields</div>
                {sectionSchemas[selectedNode.type].fields.map((f) => {
                  const val = (selectedNode.props || {})[f.id] as any;
                  return (
                    <div key={f.id}>
                      <label className="block text-sm font-medium mb-1">{f.label}</label>
                      {f.type === 'media' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={typeof val === 'string' ? val : String(f.default || '')}
                            onChange={(e) => handleUpdateProp(f.id, e.target.value)}
                            className="w-full border p-1 rounded"
                            placeholder="Pick media or paste URL"
                          />
                          <button
                            className="px-2 py-1 rounded border text-xs"
                            onClick={() => openMediaPickerFor(f.id)}
                          >
                            Browse
                          </button>
                        </div>
                      ) : f.type === 'color' ? (
                        <input
                          type="color"
                          value={
                            typeof val === 'string'
                              ? val
                              : String(f.default || '#000000')
                          }
                          onChange={(e) => handleUpdateProp(f.id, e.target.value)}
                        />
                      ) : f.type === 'number' ? (
                        <input
                          type="number"
                          value={
                            typeof val === 'number' ? val : Number(f.default || 0)
                          }
                          min={f.min}
                          max={f.max}
                          onChange={(e) =>
                            handleUpdateProp(f.id, Number(e.target.value))
                          }
                          className="w-full border p-1 rounded"
                        />
                      ) : f.type === 'select' ? (
                        <select
                          value={
                            typeof val === 'string'
                              ? val
                              : String(f.default || '')
                          }
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
                          value={
                            typeof val === 'string'
                              ? val
                              : String(f.default || '')
                          }
                          onChange={(e) => handleUpdateProp(f.id, e.target.value)}
                          className="w-full border p-1 rounded"
                        />
                      )}
                      <div className="text-xs text-gray-400 mt-1">id: {f.id}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Visual Style</div>
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={styleTargetViewport}
                  onChange={(e) =>
                    setStyleTargetViewport(e.target.value as Viewport)
                  }
                >
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                <input
                  type="color"
                  value={
                    typeof getVisualStyleValue('color') === 'string'
                      ? String(getVisualStyleValue('color'))
                      : '#111827'
                  }
                  onChange={(e) => updateVisualStyle('color', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Background</label>
                <input
                  type="color"
                  value={
                    typeof getVisualStyleValue('backgroundColor') === 'string'
                      ? String(getVisualStyleValue('backgroundColor'))
                      : '#ffffff'
                  }
                  onChange={(e) =>
                    updateVisualStyle('backgroundColor', e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={String(getVisualStyleValue('fontSize') || '')}
                    onChange={(e) =>
                      updateVisualStyle('fontSize', toStyleValueNumber(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Font Weight</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={String(getVisualStyleValue('fontWeight') || '400')}
                    onChange={(e) =>
                      updateVisualStyle('fontWeight', toStyleValueNumber(e.target.value))
                    }
                  >
                    <option value="400">400</option>
                    <option value="500">500</option>
                    <option value="600">600</option>
                    <option value="700">700</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Text Align</label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={String(getVisualStyleValue('textAlign') || 'left')}
                  onChange={(e) => updateVisualStyle('textAlign', e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Padding</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={String(getVisualStyleValue('padding') || '')}
                    onChange={(e) =>
                      updateVisualStyle('padding', toStyleValueNumber(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Margin</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={String(getVisualStyleValue('margin') || '')}
                    onChange={(e) =>
                      updateVisualStyle('margin', toStyleValueNumber(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Border Radius
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={String(getVisualStyleValue('borderRadius') || '')}
                    onChange={(e) =>
                      updateVisualStyle(
                        'borderRadius',
                        toStyleValueNumber(e.target.value),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Border Width</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={String(getVisualStyleValue('borderWidth') || '')}
                    onChange={(e) =>
                      updateVisualStyle(
                        'borderWidth',
                        toStyleValueNumber(e.target.value),
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Border Color</label>
                <input
                  type="color"
                  value={
                    typeof getVisualStyleValue('borderColor') === 'string'
                      ? String(getVisualStyleValue('borderColor'))
                      : '#d1d5db'
                  }
                  onChange={(e) => updateVisualStyle('borderColor', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Shadow (CSS)</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="0 8px 20px rgba(0,0,0,0.12)"
                  value={String(getVisualStyleValue('boxShadow') || '')}
                  onChange={(e) => updateVisualStyle('boxShadow', e.target.value)}
                />
              </div>
            </div>

            {!sectionSchemas[selectedNode.type]?.fields?.length &&
            isJsonRecord(selectedNode.props) ? (
              <div className="space-y-2">
                <div className="font-semibold text-sm">Raw Props</div>
                {Object.entries(selectedNode.props)
                  .filter(([key]) => key !== 'style' && key !== 'styleByViewport')
                  .map(([key, val]) => (
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
            ) : null}
          </div>
        ) : (
          <p className="text-gray-500">Select a component</p>
        )}
      </aside>
    </div>
  );
}
