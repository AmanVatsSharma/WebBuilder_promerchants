/**
 * File: libs/contracts/src/lib/editor-engine.ts
 * Module: contracts
 * Purpose: Pure functions to apply EditorAction to PageContentV1 (AI-agent safe command layer)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Keep this file dependency-free and deterministic
 * - These functions should be used by:
 *   - Human UI (undo/redo/history)
 *   - Future AI agent (vibe-coding edits) with the same safety rules
 */

import type { EditorAction, PageContentV1, PageNode } from './contracts';

function updateNode(root: PageNode, id: string, updateFn: (node: PageNode) => PageNode): PageNode {
  if (root.id === id) return updateFn(root);
  if (!root.children) return root;
  return { ...root, children: root.children.map((c) => updateNode(c, id, updateFn)) };
}

function deleteNode(root: PageNode, id: string): PageNode {
  if (!root.children?.length) return root;
  const filtered = root.children.filter((c) => c.id !== id).map((c) => deleteNode(c, id));
  return { ...root, children: filtered };
}

function insertNode(root: PageNode, parentId: string, index: number, node: PageNode): PageNode {
  return updateNode(root, parentId, (p) => {
    const children = p.children || [];
    const idx = Math.max(0, Math.min(index, children.length));
    return { ...p, children: [...children.slice(0, idx), node, ...children.slice(idx)] };
  });
}

/**
 * Apply an action to PageContentV1.
 * Returns the new content; does not mutate the input.
 */
export function applyEditorAction(content: PageContentV1, action: EditorAction): PageContentV1 {
  switch (action.type) {
    case 'SelectNode':
      // Selection is UI state, not content state
      return content;
    case 'InsertNode':
      return { ...content, root: insertNode(content.root, action.parentId, action.index, action.node) };
    case 'UpdateNodeProps':
      return {
        ...content,
        root: updateNode(content.root, action.nodeId, (n) => ({
          ...n,
          props: { ...(n.props || {}), ...action.patch },
        })),
      };
    case 'DeleteNode':
      return { ...content, root: deleteNode(content.root, action.nodeId) };
    case 'MoveNode': {
      // Minimal v1: support moving within root only.
      if (action.newParentId !== 'root') return content;
      const root = content.root;
      const children = root.children || [];
      const idx = children.findIndex((c) => c.id === action.nodeId);
      if (idx === -1) return content;
      const node = children[idx];
      const removed = [...children.slice(0, idx), ...children.slice(idx + 1)];
      const newIndex = Math.max(0, Math.min(action.newIndex, removed.length));
      const nextChildren = [...removed.slice(0, newIndex), node, ...removed.slice(newIndex)];
      return { ...content, root: { ...root, children: nextChildren } };
    }
    default:
      return content;
  }
}


