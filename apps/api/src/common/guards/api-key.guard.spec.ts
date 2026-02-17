/**
 * @file api-key.guard.spec.ts
 * @module common/guards
 * @description Unit tests for ApiKeyGuard behavior with optional enforcement
 * @author BharatERP
 * @created 2026-02-16
 */

import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function mockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const originalApiKey = process.env.API_AUTH_KEY;

  afterEach(() => {
    process.env.API_AUTH_KEY = originalApiKey;
  });

  it('allows requests when API key auth is disabled', () => {
    process.env.API_AUTH_KEY = '';
    const guard = new ApiKeyGuard();
    expect(guard.canActivate(mockContext({}))).toBe(true);
  });

  it('rejects requests with missing/invalid key when enabled', () => {
    process.env.API_AUTH_KEY = 'secret';
    const guard = new ApiKeyGuard();
    expect(() => guard.canActivate(mockContext({}))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockContext({ 'x-api-key': 'wrong' }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows requests with matching key when enabled', () => {
    process.env.API_AUTH_KEY = 'secret';
    const guard = new ApiKeyGuard();
    expect(guard.canActivate(mockContext({ 'x-api-key': 'secret' }))).toBe(true);
  });
});

