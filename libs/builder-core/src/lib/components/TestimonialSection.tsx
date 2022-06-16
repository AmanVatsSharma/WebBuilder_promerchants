/**
 * @file TestimonialSection.tsx
 * @module builder-core
 * @description Testimonial highlight section component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const TestimonialSection: React.FC<{
  quote?: string;
  author?: string;
  role?: string;
  style?: React.CSSProperties;
}> = ({
  quote = 'This builder helped us launch twice as fast.',
  author = 'Happy Merchant',
  role = 'Founder',
  style,
}) => {
  return (
    <section className="p-8" style={style}>
      <blockquote className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-lg text-slate-800">"{quote}"</p>
        <footer className="mt-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{author}</span>
          {role ? ` · ${role}` : ''}
        </footer>
      </blockquote>
    </section>
  );
};
