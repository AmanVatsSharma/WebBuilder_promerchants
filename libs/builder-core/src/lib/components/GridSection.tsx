/**
 * @file GridSection.tsx
 * @module builder-core
 * @description Generic grid section for feature cards
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const GridSection: React.FC<{
  columns?: number;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ columns = 3, gap = 16, style }) => {
  const items = [
    { title: 'Fast setup', text: 'Launch your first page in minutes.' },
    { title: 'Flexible design', text: 'Control spacing, typography, and layout.' },
    { title: 'Conversion focus', text: 'Design with clear action hierarchy.' },
  ];

  return (
    <section className="p-6" style={style}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
          gap,
        }}
      >
        {items.map((item) => (
          <article key={item.title} className="rounded-lg border p-4 bg-white shadow-sm">
            <h3 className="font-semibold text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-600 mt-2">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
