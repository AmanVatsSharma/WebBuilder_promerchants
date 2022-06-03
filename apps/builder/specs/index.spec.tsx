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

jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(async () => []),
  apiPost: jest.fn(async () => ({})),
}));

describe('Page', () => {
  it('should render dashboard shell', async () => {
    const { getByRole, getByText, queryByText } = render(<Page />);
    expect(getByText(/WebBuilder Studio/i)).toBeTruthy();
    expect(getByRole('heading', { name: /Create Site/i })).toBeTruthy();

    await waitFor(() => {
      expect(queryByText(/Loading projects/i)).toBeFalsy();
    });
  });
});
