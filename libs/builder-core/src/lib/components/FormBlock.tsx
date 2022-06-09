/**
 * @file FormBlock.tsx
 * @module builder-core
 * @description Contact/lead form block component
 * @author BharatERP
 * @created 2026-02-15
 */
import React from 'react';

export const FormBlock: React.FC<{
  title?: string;
  buttonLabel?: string;
  style?: React.CSSProperties;
}> = ({ title = 'Get in touch', buttonLabel = 'Submit', style }) => {
  return (
    <section className="p-6" style={style}>
      <div className="max-w-xl rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4 grid gap-3">
          <input className="border rounded px-3 py-2" placeholder="Your name" />
          <input className="border rounded px-3 py-2" placeholder="Email address" />
          <textarea className="border rounded px-3 py-2 min-h-24" placeholder="How can we help?" />
          <button className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
};
