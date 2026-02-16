/**
 * File: apps/builder/specs/themes.spec.tsx
 * Module: builder
 * Purpose: Smoke tests for themes page upload and list controls
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import ThemesClient from '../src/app/themes/themes.client';

const apiUploadMock = jest.fn(async () => ({}));
const FIXED_ISO = '2026-02-16T10:00:00.000Z';

jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(async (path: string) => {
    if (path === '/api/themes') {
      return [
        {
          id: 'theme_1',
          name: 'Aurora Commerce',
          description: 'Premium built template',
          pricingModel: 'FREE',
          isListed: true,
          versions: [{ id: 'tv_1', version: '1.0.0', status: 'BUILT', createdAt: FIXED_ISO }],
        },
        {
          id: 'theme_2',
          name: 'Nebula Fashion',
          description: 'Needs build attention',
          pricingModel: 'PAID',
          priceCents: 4900,
          currency: 'USD',
          isListed: true,
          versions: [{ id: 'tv_2', version: '2.1.0', status: 'FAILED', createdAt: FIXED_ISO }],
        },
        {
          id: 'theme_3',
          name: 'Horizon Capsule',
          description: 'In active build queue',
          pricingModel: 'PAID',
          priceCents: 9900,
          currency: 'USD',
          isListed: false,
          versions: [{ id: 'tv_3', version: '3.0.0', status: 'BUILDING', createdAt: FIXED_ISO }],
        },
      ];
    }
    return [];
  }),
  apiPost: jest.fn(async () => ({})),
  apiPut: jest.fn(async () => ({})),
  apiUpload: (...args: unknown[]) => apiUploadMock(...args),
}));

describe('ThemesClient', () => {
  beforeEach(() => {
    apiUploadMock.mockClear();
    window.sessionStorage.clear();
  });

  it('renders curation controls, supports filtering, and keeps upload flow', async () => {
    const { asFragment, getByRole, getByText, getByPlaceholderText, queryByText, container } = render(<ThemesClient />);

    await waitFor(() => {
      expect(getByText(/Aurora Commerce/i)).toBeTruthy();
      expect(getByText(/Upload Theme Bundle/i)).toBeTruthy();
    });

    const uploadButton = getByRole('button', { name: /Upload Theme$/i });
    expect(uploadButton).toBeTruthy();
    expect(getByPlaceholderText(/Theme name/i)).toBeTruthy();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    if (fileInput) {
      const file = new File(['zip'], 'demo-theme.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(fileInput.files?.[0]?.name).toBe('demo-theme.zip');
    }

    expect(getByText(/Curation presets/i)).toBeTruthy();
    expect(getByText(/Active preset: All themes/i)).toBeTruthy();
    expect(getByText(/Build: READY/i)).toBeTruthy();

    fireEvent.click(getByRole('button', { name: /Needs attention/i }));

    await waitFor(() => {
      expect(getByText(/Nebula Fashion/i)).toBeTruthy();
      expect(queryByText(/Aurora Commerce/i)).toBeNull();
      expect(getByText(/Active preset: Needs attention/i)).toBeTruthy();
    });
    expect(window.sessionStorage.getItem('builder.themeStudio.curationView.v1')).toContain(
      'NEEDS_ATTENTION',
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('restores saved curation preset from session storage', async () => {
    window.sessionStorage.setItem(
      'builder.themeStudio.curationView.v1',
      JSON.stringify({
        activePreset: 'NEEDS_ATTENTION',
        searchValue: '',
        pricingFilter: 'ALL',
        listingFilter: 'ALL',
        buildFilter: 'FAILED',
        sortMode: 'BUILD_ISSUES_FIRST',
      }),
    );

    const { getByText, queryByText } = render(<ThemesClient />);

    await waitFor(() => {
      expect(getByText(/Active preset: Needs attention/i)).toBeTruthy();
      expect(getByText(/Nebula Fashion/i)).toBeTruthy();
      expect(queryByText(/Aurora Commerce/i)).toBeNull();
    });
  });
});
