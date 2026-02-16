/**
 * @file auth-context.guard.spec.ts
 * @module common/guards
 * @description Unit tests for AuthContextGuard JWT parsing behavior
 * @author BharatERP
 * @created 2026-02-16
 */

import { createHmac } from 'crypto';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AuthContextGuard } from './auth-context.guard';

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signToken(payload: Record<string, unknown>, secret: string) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function mockContext(input: { headers?: Record<string, string>; path?: string }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: input.headers || {},
        originalUrl: input.path || '/api/sites/site_1',
        url: input.path || '/api/sites/site_1',
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthContextGuard', () => {
  const originalEnforce = process.env.ENFORCE_AUTH_CONTEXT;
  const originalSecret = process.env.AUTH_JWT_SECRET;
  const originalIssuer = process.env.AUTH_JWT_ISSUER;
  const originalAudience = process.env.AUTH_JWT_AUDIENCE;

  afterEach(() => {
    process.env.ENFORCE_AUTH_CONTEXT = originalEnforce;
    process.env.AUTH_JWT_SECRET = originalSecret;
    process.env.AUTH_JWT_ISSUER = originalIssuer;
    process.env.AUTH_JWT_AUDIENCE = originalAudience;
  });

  it('allows requests when auth context is disabled', () => {
    process.env.ENFORCE_AUTH_CONTEXT = 'false';
    const guard = new AuthContextGuard();
    expect(guard.canActivate(mockContext({ headers: {} }))).toBe(true);
  });

  it('rejects requests with missing bearer token when enabled', () => {
    process.env.ENFORCE_AUTH_CONTEXT = 'true';
    process.env.AUTH_JWT_SECRET = 'test-secret';
    const guard = new AuthContextGuard();
    expect(() => guard.canActivate(mockContext({ headers: {} }))).toThrow(ForbiddenException);
  });

  it('allows public auth/login route without token when enabled', () => {
    process.env.ENFORCE_AUTH_CONTEXT = 'true';
    process.env.AUTH_JWT_SECRET = 'test-secret';
    const guard = new AuthContextGuard();
    expect(guard.canActivate(mockContext({ headers: {}, path: '/api/auth/login' }))).toBe(true);
  });

  it('accepts valid bearer token and populates auth context', () => {
    process.env.ENFORCE_AUTH_CONTEXT = 'true';
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.AUTH_JWT_ISSUER = 'issuer';
    process.env.AUTH_JWT_AUDIENCE = 'audience';

    const token = signToken(
      {
        sub: 'actor_1',
        workspaceIds: ['ws_1', 'ws_2'],
        iss: 'issuer',
        aud: 'audience',
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      'test-secret',
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const guard = new AuthContextGuard();
    expect(guard.canActivate(context)).toBe(true);
    expect((req as any).authContext).toEqual({
      actorId: 'actor_1',
      workspaceIds: ['ws_1', 'ws_2'],
    });
  });
});

