/**
 * @file EditorClient.tsx
 * @module editor
 * @description Client-side editor logic
 * @author BharatERP
 * @created 2025-02-09
 */
'use client';

import React, { useState, useEffect } from 'react';
import { PageRenderer, registerCoreComponents, PageContent, ComponentData } from '@web-builder/builder-core';

// Initialize components
registerCoreComponents();

const initialContent: PageContent = {
  root: {
    type: 'Container',
    id: 'root',
    children: [],
    props: {}
  }
};

export default function EditorClient({ pageId }: { pageId: string }) {
  const [content, setContent] = useState<PageContent>(initialContent);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    fetch(`/api/sites/pages/${pageId}`)
      .then(res => {
         if (res.ok) return res.json();
         throw new Error('Failed to load');
      })
      .then(data => {
        if (data && data.content) {
           setContent({ root: data.content });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [pageId]);

  // Helper to find node by ID and update it (immutable-ish)
  const updateNode = (root: ComponentData, id: string, updateFn: (node: ComponentData) => ComponentData): ComponentData => {
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
    const newComponent: ComponentData = {
      type,
      id: crypto.randomUUID(),
      props: type === 'HeroSection' ? { title: 'New Hero' } : { text: 'New Text' }
    };

    setContent(prev => {
      // Add to root for simplicity in POC, or selected container
      const targetId = selectedId || 'root';
      
      // Simple recursive finder/updater
      const add = (node: ComponentData): ComponentData => {
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
      
      return { root: add(prev.root) };
    });
  };

  const handleUpdateProp = (key: string, value: any) => {
    if (!selectedId) return;
    setContent(prev => ({
      root: updateNode(prev.root, selectedId, (node) => ({
        ...node,
        props: { ...node.props, [key]: value }
      }))
    }));
  };

  const savePage = async () => {
    try {
      await fetch(`/api/sites/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.root }) 
      });
      alert('Saved!');
    } catch (e) {
      console.error(e);
      alert('Error saving');
    }
  };

  // Find selected node to show props
  const findNode = (node: ComponentData, id: string): ComponentData | undefined => {
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

