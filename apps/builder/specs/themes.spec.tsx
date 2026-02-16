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

jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(async (path: string) => {
    if (path === '/api/themes') {
      return [
        {
          id: 'theme_1',
          name: 'Demo Theme',
          description: 'Demo',
          versions: [{ id: 'tv_1', version: '1.0.0', status: 'BUILT', createdAt: new Date().toISOString() }],
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
  });

  it('renders upload controls and theme versions', async () => {
    const { getByRole, getByText, getByPlaceholderText, container } = render(<ThemesClient />);

    await waitFor(() => {
      expect(getByText(/Demo Theme/i)).toBeTruthy();
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
  });
});
