/**
 * @file ButtonBlock.tsx
 * @module builder-core
 * @description Action button block component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const ButtonBlock: React.FC<{
  label?: string;
  href?: string;
  style?: React.CSSProperties;
}> = ({ label = 'Click me', href = '#', style }) => {
  return (
    <div className="p-4">
      <a
        href={href}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        style={style}
      >
        {label}
      </a>
    </div>
  );
};
