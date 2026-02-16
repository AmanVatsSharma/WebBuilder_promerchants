/**
 * File: apps/builder/specs/index.spec.tsx
 * Module: builder
 * Purpose: Smoke tests for builder dashboard root route
 * Author: Cursor / Aman
 * Last-updated: 2026-02-15
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Page from '../src/app/page';

const FIXED_ISO = '2026-02-16T10:00:00.000Z';

jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(async (path: string) => {
    if (path === '/api/sites') {
      return [{ id: 'site_1', name: 'Demo Site', domain: 'demo.localhost' }];
    }
    if (path === '/api/sites/site_1/pages') {
      return [{ id: 'page_1', title: 'Home', slug: 'home', isPublished: true }];
    }
    if (path === '/api/sites/site_1/theme') {
      return {
        siteId: 'site_1',
        themeId: 'theme_1',
        draftThemeVersionId: 'tv_draft_1',
        publishedThemeVersionId: 'tv_published_1',
      };
    }
    if (path === '/api/sites/site_1/theme/audits') {
      return [
        {
          id: 'audit_1',
          action: 'PUBLISH',
          actor: 'demo',
          fromThemeVersionId: null,
          toThemeVersionId: 'tv_published_1',
          createdAt: FIXED_ISO,
        },
      ];
    }
    if (path === '/api/themes/versions/tv_draft_1') {
      return { id: 'tv_draft_1', version: '1.1.0-draft', status: 'DRAFT' };
    }
    if (path === '/api/themes/versions/tv_published_1') {
      return { id: 'tv_published_1', version: '1.0.0', status: 'BUILT' };
    }
    if (path === '/api/domains') {
      return [{ id: 'domain_1', siteId: 'site_1', host: 'shop.demo.localhost', status: 'PENDING' }];
    }
    if (path === '/api/domains/challenges/metrics') {
      return {
        generatedAt: FIXED_ISO,
        totalChallenges: 12,
        issuedCount: 1,
        verifiedCount: 9,
        failedCount: 2,
        pendingPropagationCount: 0,
        propagatingCount: 1,
        readyPropagationCount: 9,
        failedPropagationCount: 2,
        dueRetryCount: 1,
        exhaustedCount: 1,
        averageAttempts: 1.8,
        verificationSuccessRate: 0.8182,
        alertCount: 2,
        alertsLast24h: 1,
        undeliveredAlerts: 1,
      };
    }
    if (path.startsWith('/api/domains/challenges/alerts')) {
      return [
        {
          id: 'alert_1',
          challengeId: 'challenge_1',
          mappingId: 'mapping_1',
          severity: 'ERROR',
          eventType: 'domain.challenge.failed',
          message: 'TXT record mismatch',
          delivered: false,
          createdAt: FIXED_ISO,
        },
      ];
    }
    return [];
  }),
  apiPost: jest.fn(async () => ({})),
}));

describe('Page', () => {
  it('should render dashboard shell', async () => {
    const { asFragment, getByRole, getByText, getAllByText, queryByText } = render(<Page />);
    expect(getByText(/WebBuilder Studio/i)).toBeTruthy();
    expect(getByRole('heading', { name: /Create Site/i })).toBeTruthy();

    await waitFor(() => {
      expect(queryByText(/Loading projects/i)).toBeFalsy();
    });

    expect(getAllByText(/Domains/i).length).toBeGreaterThan(0);
    expect(getByText(/shop.demo.localhost/i)).toBeTruthy();
    expect(getByText(/Verify/i)).toBeTruthy();
    expect(getByText(/Domain Ops Pulse/i)).toBeTruthy();
    expect(getByText(/Success rate/i)).toBeTruthy();
    expect(getByText(/TXT record mismatch/i)).toBeTruthy();
    expect(getByText(/Published theme version:/i)).toBeTruthy();
    expect(getByText(/Draft status:/i)).toBeTruthy();
    expect(getByText(/Last release:/i)).toBeTruthy();
    expect(getByText(/Open Latest Editor/i)).toBeTruthy();
    expect(getByText(/Open Live Storefront/i)).toBeTruthy();
    expect(asFragment()).toMatchSnapshot();
  });
});
