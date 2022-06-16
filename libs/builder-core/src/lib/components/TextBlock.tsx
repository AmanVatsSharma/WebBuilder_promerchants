/**
 * @file TextBlock.tsx
 * @module builder-core
 * @description Text block component
 * @author BharatERP
 * @created 2025-02-09
 */
import React from 'react';

export const TextBlock: React.FC<{
  text: string;
  style?: React.CSSProperties;
}> = ({ text, style }) => {
  return (
    <div className="prose max-w-none p-8" style={style}>
      <p>{text}</p>
    </div>
  );
};

