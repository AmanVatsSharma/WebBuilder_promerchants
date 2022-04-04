import React from 'react';
import { resolveTemplateMatchForPath } from '../src/lib/theme-routing';

describe('Page', () => {
  it('should resolve manifest routes to templateIds', () => {
    const match = resolveTemplateMatchForPath({
      manifest: { schemaVersion: 1, name: 'T', version: '1.0.0', entry: 'entry.tsx', routes: [{ path: '/', template: 'pages/home' }] },
      templates: { 'pages/home': () => null },
      pathname: '/',
    });
    expect(match?.templateId).toBe('pages/home');
  });
});
