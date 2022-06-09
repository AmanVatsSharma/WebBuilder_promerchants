/**
 * @file FooterSection.tsx
 * @module builder-core
 * @description Footer section component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const FooterSection: React.FC<{
  text?: string;
  style?: React.CSSProperties;
}> = ({ text = 'Powered by WebBuilder', style }) => {
  return (
    <footer className="border-t bg-slate-950 text-slate-200 px-6 py-8 text-sm" style={style}>
      {text}
    </footer>
  );
};
