/**
 * @file ProductListSection.tsx
 * @module builder-core
 * @description Product list/grid section component for commerce pages
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const ProductListSection: React.FC<{
  title?: string;
  count?: number;
  style?: React.CSSProperties;
}> = ({ title = 'Featured Products', count = 4, style }) => {
  const safeCount = Math.max(1, Math.min(12, count));
  const cards = Array.from({ length: safeCount }, (_, idx) => ({
    id: `p-${idx + 1}`,
    title: `Product ${idx + 1}`,
    price: `$${(idx + 1) * 12}.00`,
    image: `https://picsum.photos/seed/product-${idx + 1}/600/400`,
  }));

  return (
    <section className="p-6" style={style}>
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {cards.map((card) => (
          <article key={card.id} className="rounded-lg border bg-white overflow-hidden">
            <img src={card.image} alt={card.title} className="w-full h-32 object-cover" />
            <div className="p-3">
              <div className="text-sm font-semibold text-slate-900">{card.title}</div>
              <div className="text-xs text-slate-600 mt-1">{card.price}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
