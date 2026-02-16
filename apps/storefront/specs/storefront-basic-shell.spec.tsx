/** @jest-environment jsdom */
/**
 * File: apps/storefront/specs/storefront-basic-shell.spec.tsx
 * Module: storefront
 * Purpose: UI smoke tests for basic branded storefront shell
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StorefrontBasicShell } from '../src/components/storefront-basic-shell';

describe('StorefrontBasicShell', () => {
  it('renders branded header, host marker, and content', () => {
    const { getByText } = render(
      <StorefrontBasicShell siteName="Demo Store" host="shop.demo.localhost">
        <div>Demo body</div>
      </StorefrontBasicShell>,
    );

    expect(getByText(/Demo Store/i)).toBeTruthy();
    expect(getByText(/shop.demo.localhost/i)).toBeTruthy();
    expect(getByText(/Demo body/i)).toBeTruthy();
    expect(getByText(/Powered by WebBuilder storefront runtime/i)).toBeTruthy();
  });
});

