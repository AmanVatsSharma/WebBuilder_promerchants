/**
 * File: apps/builder/specs/publish.spec.tsx
 * Module: builder
 * Purpose: Smoke tests for publish center rendering and key controls
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import PublishClient from '../src/app/sites/[siteId]/publish/publish.client';

const FIXED_ISO = '2026-02-16T10:00:00.000Z';

jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(async (path: string) => {
    if (path.includes('/theme/audits')) {
      return [
        {
          id: 'a1',
          action: 'PUBLISH',
          actor: 'test',
          fromThemeVersionId: null,
          toThemeVersionId: 'tv_1',
          createdAt: FIXED_ISO,
        },
      ];
    }
    if (path.includes('/theme') && !path.includes('/themes/')) {
      return {
        siteId: 'site_1',
        themeId: 'th_1',
        draftThemeVersionId: 'tv_1',
        publishedThemeVersionId: 'tv_1',
      };
    }
    if (path.includes('/themes/versions/')) {
      return {
        id: 'tv_1',
        status: 'BUILT',
        manifest: { routes: [{ path: '/', template: 'pages/home' }] },
      };
    }
    if (path.includes('/themes/th_1')) {
      return {
        id: 'th_1',
        name: 'Default',
        versions: [{ id: 'tv_1', version: '1.0.0', status: 'BUILT' }],
      };
    }
    if (path.includes('/pages')) {
      return [{ id: 'p1', title: 'Home', slug: 'home', isPublished: true }];
    }
    return [];
  }),
  apiPost: jest.fn(async () => ({})),
}));

describe('PublishClient', () => {
  it('renders publish sections and rollback controls', async () => {
    const { asFragment, getByText } = render(<PublishClient siteId="site_1" />);

    await waitFor(() => {
      expect(getByText(/Publish Center/i)).toBeTruthy();
      expect(getByText(/Readiness Snapshot/i)).toBeTruthy();
      expect(getByText(/Rollback Theme/i)).toBeTruthy();
      expect(getByText(/Theme Publish History/i)).toBeTruthy();
    });

    expect(asFragment()).toMatchSnapshot();
  });
});
