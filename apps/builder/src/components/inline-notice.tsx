/**
 * File: apps/builder/src/components/inline-notice.tsx
 * Module: builder-ui
 * Purpose: Shared inline notice banner for non-blocking UI feedback
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */
'use client';

import React from 'react';

export type NoticeTone = 'info' | 'success' | 'error';

function toneClass(tone: NoticeTone) {
  if (tone === 'success') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  if (tone === 'error') return 'bg-rose-50 border-rose-200 text-rose-800';
  return 'bg-blue-50 border-blue-200 text-blue-800';
}

function toneLabel(tone: NoticeTone) {
  if (tone === 'success') return 'Success';
  if (tone === 'error') return 'Error';
  return 'Info';
}

export function InlineNotice({
  tone,
  message,
  onDismiss,
}: {
  tone: NoticeTone;
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide">{toneLabel(tone)}</div>
          <div>{message}</div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded border border-current/30 px-2 py-0.5 text-[11px] hover:bg-white/30"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

