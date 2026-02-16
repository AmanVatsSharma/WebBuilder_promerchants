/** @jest-environment jsdom */
/**
 * File: apps/storefront/specs/storefront-fallback-shell.spec.tsx
 * Module: storefront
 * Purpose: UI smoke tests for premium storefront fallback shell
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StorefrontFallbackShell } from '../src/components/storefront-fallback-shell';

describe('StorefrontFallbackShell', () => {
  it('renders diagnostics, hints, and action links', () => {
    const { asFragment, getByText } = render(
      <StorefrontFallbackShell
        badge="Tenant missing"
        title="Storefront tenant could not be resolved"
        description="Connect domain mapping from Builder."
        details={[
          { label: 'Host', value: 'shop.example.com' },
          { label: 'Request ID', value: 'req_1' },
        ]}
        actions={[{ label: 'Open storefront root', href: '/' }]}
        hints={['Verify domain mapping.', 'Check DNS records.']}
      />,
    );

    expect(getByText(/Tenant missing/i)).toBeTruthy();
    expect(getByText(/Storefront tenant could not be resolved/i)).toBeTruthy();
    expect(getByText(/shop.example.com/i)).toBeTruthy();
    expect(getByText(/Open storefront root/i)).toBeTruthy();
    expect(getByText(/Verify domain mapping/i)).toBeTruthy();
    expect(asFragment()).toMatchSnapshot();
  });
});

