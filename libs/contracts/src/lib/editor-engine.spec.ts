/**
 * File: libs/contracts/src/lib/editor-engine.spec.ts
 * Module: contracts
 * Purpose: Unit tests for editor command engine behaviors
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 */
import type { PageContentV1, PageNode } from './contracts';
import { applyEditorAction } from './editor-engine';

function contentWithRoot(children: PageNode[] = []): PageContentV1 {
  return {
    schemaVersion: 1,
    root: {
      id: 'root',
      type: 'Container',
      props: {},
      children,
    },
  };
}

describe('editor-engine', () => {
  it('inserts a node at requested index', () => {
    const initial = contentWithRoot([
      { id: 'a', type: 'TextBlock', props: { text: 'A' } },
      { id: 'b', type: 'TextBlock', props: { text: 'B' } },
    ]);

    const next = applyEditorAction(initial, {
      type: 'InsertNode',
      parentId: 'root',
      index: 1,
      node: { id: 'x', type: 'TextBlock', props: { text: 'X' } },
    });

    expect(next.root.children?.map((c) => c.id)).toEqual(['a', 'x', 'b']);
  });

  it('updates node props immutably', () => {
    const initial = contentWithRoot([
      { id: 'a', type: 'TextBlock', props: { text: 'before' } },
    ]);

    const next = applyEditorAction(initial, {
      type: 'UpdateNodeProps',
      nodeId: 'a',
      patch: { text: 'after' },
    });

    expect(next.root.children?.[0].props?.['text']).toBe('after');
    expect(initial.root.children?.[0].props?.['text']).toBe('before');
  });

  it('deletes a node by id', () => {
    const initial = contentWithRoot([
      { id: 'a', type: 'TextBlock', props: { text: 'A' } },
      { id: 'b', type: 'TextBlock', props: { text: 'B' } },
    ]);

    const next = applyEditorAction(initial, {
      type: 'DeleteNode',
      nodeId: 'a',
    });

    expect(next.root.children?.map((c) => c.id)).toEqual(['b']);
  });

  it('moves nodes across containers', () => {
    const initial = contentWithRoot([
      {
        id: 'left',
        type: 'Container',
        props: {},
        children: [{ id: 'n1', type: 'TextBlock', props: { text: 'Node 1' } }],
      },
      {
        id: 'right',
        type: 'Container',
        props: {},
        children: [],
      },
    ]);

    const moved = applyEditorAction(initial, {
      type: 'MoveNode',
      nodeId: 'n1',
      newParentId: 'right',
      newIndex: 0,
    });

    const left = moved.root.children?.find((c) => c.id === 'left');
    const right = moved.root.children?.find((c) => c.id === 'right');
    expect(left?.children?.length).toBe(0);
    expect(right?.children?.[0].id).toBe('n1');
  });

  it('prevents moving a parent into its own subtree', () => {
    const initial = contentWithRoot([
      {
        id: 'parent',
        type: 'Container',
        props: {},
        children: [
          {
            id: 'child',
            type: 'Container',
            props: {},
            children: [{ id: 'leaf', type: 'TextBlock', props: { text: 'leaf' } }],
          },
        ],
      },
    ]);

    const next = applyEditorAction(initial, {
      type: 'MoveNode',
      nodeId: 'parent',
      newParentId: 'child',
      newIndex: 0,
    });

    expect(next).toEqual(initial);
  });
});
