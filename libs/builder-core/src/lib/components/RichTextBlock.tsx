/**
 * @file RichTextBlock.tsx
 * @module builder-core
 * @description Rich text block component with safe plain-html fallback
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const RichTextBlock: React.FC<{
  text?: string;
  html?: string;
  style?: React.CSSProperties;
}> = ({ text, html, style }) => {
  const normalizedHtml =
    typeof html === 'string' && html.trim()
      ? html
      : `<p>${(text || 'Rich text content').replace(/\n/g, '<br/>')}</p>`;

  return (
    <div
      className="prose max-w-none p-6"
      style={style}
      dangerouslySetInnerHTML={{ __html: normalizedHtml }}
    />
  );
};
