/**
 * @file CtaBannerSection.tsx
 * @module builder-core
 * @description Conversion-focused CTA banner section component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const CtaBannerSection: React.FC<{
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonHref?: string;
  style?: React.CSSProperties;
}> = ({
  title = 'Ready to launch your store?',
  subtitle = 'Start today and go live with confidence.',
  buttonLabel = 'Start free',
  buttonHref = '#',
  style,
}) => {
  return (
    <section className="p-6" style={style}>
      <div className="rounded-xl bg-slate-900 text-white p-6 md:p-8">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-sm text-slate-200 mt-2">{subtitle}</p>
        <a
          href={buttonHref}
          className="inline-flex mt-4 rounded bg-blue-500 px-4 py-2 text-sm font-semibold hover:bg-blue-400"
        >
          {buttonLabel}
        </a>
      </div>
    </section>
  );
};
