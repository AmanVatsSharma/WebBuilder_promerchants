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

function containsNode(root: PageNode, id: string): boolean {
  if (root.id === id) return true;
  for (const c of root.children || []) {
    if (containsNode(c, id)) return true;
  }
  return false;
}

function removeNode(root: PageNode, id: string): { next: PageNode; removed: PageNode | null } {
  if (!root.children?.length) return { next: root, removed: null };

  // Direct child removal
  const idx = root.children.findIndex((c) => c.id === id);
  if (idx !== -1) {
    const removed = root.children[idx];
    const nextChildren = [...root.children.slice(0, idx), ...root.children.slice(idx + 1)];
    return { next: { ...root, children: nextChildren }, removed };
  }

  // Recurse into children
  let removed: PageNode | null = null;
  const nextChildren = root.children.map((c) => {
    if (removed) return c;
    const res = removeNode(c, id);
    removed = res.removed;
    return res.next;
  });
  return { next: { ...root, children: nextChildren }, removed };
}

function moveNode(root: PageNode, nodeId: string, newParentId: string, newIndex: number): PageNode {
  // Cannot move root
  if (nodeId === root.id) return root;

  const { next: without, removed } = removeNode(root, nodeId);
  if (!removed) return root;

  // Prevent moving a node into its own subtree
  if (containsNode(removed, newParentId)) {
    return root;
  }

  return insertNode(without, newParentId, newIndex, removed);
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
      return { ...content, root: moveNode(content.root, action.nodeId, action.newParentId, action.newIndex) };
    }
    default:
      return content;
  }
}


