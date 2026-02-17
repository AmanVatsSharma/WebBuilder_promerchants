/**
 * File: apps/storefront/src/components/storefront-fallback-shell.tsx
 * Module: storefront
 * Purpose: Shared premium fallback shell for tenant/theme/page failures
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import React from 'react';

type Detail = { label: string; value: string };
type Action = { label: string; href: string; external?: boolean };

export function StorefrontFallbackShell({
  badge,
  title,
  description,
  details = [],
  actions = [],
  hints = [],
}: {
  badge: string;
  title: string;
  description: string;
  details?: Detail[];
  actions?: Action[];
  hints?: string[];
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-2xl">
          <div className="inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
            {badge}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>

          {details.length ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnostics</div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                {details.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded border border-slate-700 bg-slate-900 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="mt-1 break-all font-mono text-xs text-slate-100">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {actions.length ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <a
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  target={action.external ? '_blank' : undefined}
                  rel={action.external ? 'noreferrer' : undefined}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-indigo-400 hover:text-indigo-100"
                >
                  {action.label}
                </a>
              ))}
            </div>
          ) : null}

          {hints.length ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Suggested next steps</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                {hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

