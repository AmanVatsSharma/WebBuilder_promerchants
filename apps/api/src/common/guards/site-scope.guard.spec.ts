/**
 * @file site-scope.guard.spec.ts
 * @module common/guards
 * @description Unit tests for SiteScopeGuard optional site authorization behavior
 * @author BharatERP
 * @created 2026-02-16
 */

import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SiteScopeGuard } from './site-scope.guard';

function mockContext(siteId: string | undefined, headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params: { siteId }, headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('SiteScopeGuard', () => {
  const originalSiteScope = process.env.ENFORCE_SITE_SCOPE;

  afterEach(() => {
    process.env.ENFORCE_SITE_SCOPE = originalSiteScope;
  });

  it('allows requests when scope enforcement is disabled', () => {
    process.env.ENFORCE_SITE_SCOPE = 'false';
    const guard = new SiteScopeGuard();
    expect(guard.canActivate(mockContext('site_1', {}))).toBe(true);
  });

  it('allows non-site routes when enabled', () => {
    process.env.ENFORCE_SITE_SCOPE = 'true';
    const guard = new SiteScopeGuard();
    expect(guard.canActivate(mockContext(undefined, {}))).toBe(true);
  });

  it('rejects mismatch when enabled', () => {
    process.env.ENFORCE_SITE_SCOPE = 'true';
    const guard = new SiteScopeGuard();
    expect(() =>
      guard.canActivate(mockContext('site_1', { 'x-site-id': 'site_2' })),
    ).toThrow(ForbiddenException);
  });

  it('allows matching site scope when enabled', () => {
    process.env.ENFORCE_SITE_SCOPE = 'true';
    const guard = new SiteScopeGuard();
    expect(guard.canActivate(mockContext('site_1', { 'x-site-id': 'site_1' }))).toBe(true);
  });
});

