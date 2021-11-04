/**
 * @file PageRenderer.tsx
 * @module builder-core
 * @description Recursive renderer for page content
 * @author BharatERP
 * @created 2025-02-09
 */
import React from 'react';
import { getComponent } from './registry';

export interface ComponentData {
  type: string;
  props?: Record<string, any>;
  children?: ComponentData[];
  id?: string; // unique id for editor selection
}

export interface PageContent {
  root: ComponentData;
}

interface PageRendererProps {
  content: PageContent;
  onComponentClick?: (id: string, e: React.MouseEvent) => void;
  selectedId?: string;
}

const RenderNode: React.FC<{ 
  node: ComponentData; 
  onComponentClick?: (id: string, e: React.MouseEvent) => void;
  selectedId?: string;
}> = ({ node, onComponentClick, selectedId }) => {
  const Component = getComponent(node.type);

  if (!Component && node.type !== 'Container') {
    return <div className="p-4 border border-red-500">Unknown component: {node.type}</div>;
  }

  const handleClick = (e: React.MouseEvent) => {
    if (onComponentClick && node.id) {
      e.stopPropagation();
      onComponentClick(node.id, e);
    }
  };

  const isSelected = selectedId && node.id === selectedId;
  const style = isSelected ? { outline: '2px solid blue', position: 'relative' as const, zIndex: 10 } : {};

  if (node.type === 'Container') {
    return (
      <div 
        onClick={handleClick}
        style={style}
        className={`min-h-[50px] ${isSelected ? 'bg-blue-50/10' : ''}`}
      >
        {node.children?.map((child, i) => (
          <RenderNode 
            key={i} 
            node={child} 
            onComponentClick={onComponentClick}
            selectedId={selectedId}
          />
        ))}
      </div>
    );
  }

  // Wrapper for selection
  return (
    <div onClick={handleClick} style={style} className="relative">
      {/* @ts-ignore */}
      <Component {...node.props} />
      {node.children && (
        <div>
          {node.children.map((child, i) => (
            <RenderNode 
              key={i} 
              node={child} 
              onComponentClick={onComponentClick} 
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PageRenderer: React.FC<PageRendererProps> = ({ content, onComponentClick, selectedId }) => {
  if (!content || !content.root) return <div>Empty page</div>;
  return <RenderNode node={content.root} onComponentClick={onComponentClick} selectedId={selectedId} />;
};

