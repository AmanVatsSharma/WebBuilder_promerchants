/**
 * @file ImageBlock.tsx
 * @module builder-core
 * @description Responsive image block component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const ImageBlock: React.FC<{
  src?: string;
  alt?: string;
  style?: React.CSSProperties;
}> = ({ src = 'https://picsum.photos/seed/webbuilder/1280/720', alt = 'Image', style }) => {
  return (
    <div className="p-4">
      <img
        src={src}
        alt={alt}
        className="w-full h-auto rounded-lg object-cover border"
        style={style}
      />
    </div>
  );
};
