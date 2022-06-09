/**
 * @file FaqSection.tsx
 * @module builder-core
 * @description FAQ accordion-like section component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

type FaqItem = { q: string; a: string };

function parseItems(raw?: string): FaqItem[] {
  if (!raw || !raw.trim()) {
    return [
      { q: 'How quickly can I launch?', a: 'Usually in a few hours.' },
      { q: 'Is this customizable?', a: 'Yes, deeply and visually.' },
    ];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.q === 'string' &&
          typeof item.a === 'string',
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}

export const FaqSection: React.FC<{
  title?: string;
  items?: string;
  style?: React.CSSProperties;
}> = ({ title = 'Frequently Asked Questions', items, style }) => {
  const rows = parseItems(items);
  return (
    <section className="p-6" style={style}>
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((item, idx) => (
          <details key={`${item.q}-${idx}`} className="rounded border bg-white p-3">
            <summary className="font-semibold cursor-pointer">{item.q}</summary>
            <p className="text-sm text-slate-600 mt-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
};
