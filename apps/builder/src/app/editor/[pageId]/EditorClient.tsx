/**
 * File: apps/builder/src/app/editor/[pageId]/EditorClient.tsx
 * Module: builder-editor
 * Purpose: Client-side editor POC (will evolve into enterprise WYSIWYG)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Currently edits PageContentV1 JSON and persists to /api/sites/pages/:pageId
 * - Adds basic debug logs to help future troubleshooting
 */
'use client';

import React, { useState, useEffect } from 'react';
import { PageRenderer, registerCoreComponents } from '@web-builder/builder-core';
import type { PageContentV1, PageNode, JsonValue } from '@web-builder/contracts';

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
  const [content, setContent] = useState<PageContentV1>(initialContent);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

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
           setContent({ schemaVersion: 1, root: data.content });
        }
      })
      .catch(err => console.error('[builder-editor] load failed', err))
      .finally(() => setLoading(false));
  }, [pageId]);

  // Helper to find node by ID and update it (immutable-ish)
  const updateNode = (root: PageNode, id: string, updateFn: (node: PageNode) => PageNode): PageNode => {
    if (root.id === id) {
      return updateFn(root);
    }
    if (root.children) {
      return {
        ...root,
        children: root.children.map(child => updateNode(child, id, updateFn))
      };
    }
    return root;
  };

  const handleAddComponent = (type: string) => {
    console.debug('[builder-editor] add component', { type, selectedId });
    const newComponent: PageNode = {
      type,
      id: crypto.randomUUID(),
      props: (type === 'HeroSection' ? { title: 'New Hero' } : { text: 'New Text' }) as Record<string, JsonValue>
    };

    setContent(prev => {
      // Add to root for simplicity in POC, or selected container
      const targetId = selectedId || 'root';
      
      // Simple recursive finder/updater
      const add = (node: PageNode): PageNode => {
        if (node.id === targetId) {
           // check if container or assumes root is container
           const children = node.children || [];
           return { ...node, children: [...children, newComponent] };
        }
        if (node.children) {
          return { ...node, children: node.children.map(add) };
        }
        return node;
      };
      
      return { ...prev, root: add(prev.root) };
    });
  };

  const handleUpdateProp = (key: string, value: JsonValue) => {
    if (!selectedId) return;
    console.debug('[builder-editor] update prop', { selectedId, key, value });
    setContent(prev => ({
      ...prev,
      root: updateNode(prev.root, selectedId, (node) => ({
        ...node,
        props: { ...node.props, [key]: value }
      }))
    }));
  };

  const savePage = async () => {
    try {
      console.debug('[builder-editor] saving page', { pageId });
      await fetch(`/api/sites/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.root })
      });
      alert('Saved!');
    } catch (e) {
      console.error('[builder-editor] save failed', e);
      alert('Error saving');
    }
  };

  // Find selected node to show props
  const findNode = (node: PageNode, id: string): PageNode | undefined => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedNode = selectedId ? findNode(content.root, selectedId) : undefined;

  if (loading) return <div>Loading page...</div>;

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r p-4">
        <h2 className="font-bold mb-4">Components</h2>
        <div className="space-y-2">
          <button 
            onClick={() => handleAddComponent('HeroSection')}
            className="w-full p-2 bg-blue-100 hover:bg-blue-200 rounded text-left"
          >
            Hero Section
          </button>
          <button 
             onClick={() => handleAddComponent('TextBlock')}
             className="w-full p-2 bg-blue-100 hover:bg-blue-200 rounded text-left"
          >
            Text Block
          </button>
        </div>
        <div className="mt-8">
           <button onClick={savePage} className="w-full p-2 bg-green-600 text-white rounded">
             Save Page
           </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 p-8 overflow-auto">
        <div className="bg-white min-h-[500px] shadow-lg">
          <PageRenderer 
            content={content} 
            onComponentClick={(id) => setSelectedId(id)}
            selectedId={selectedId}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-64 bg-white border-l p-4">
        <h2 className="font-bold mb-4">Properties</h2>
        {selectedNode ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">ID: {selectedNode.id}</div>
            <div className="text-sm text-gray-500 mb-2">Type: {selectedNode.type}</div>
            {Object.entries(selectedNode.props || {}).map(([key, val]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{key}</label>
                <input 
                  type="text" 
                  value={val} 
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

