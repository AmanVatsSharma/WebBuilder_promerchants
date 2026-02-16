/**
 * @file site-owner.guard.spec.ts
 * @module common/guards
 * @description Unit tests for optional site ownership guard
 * @author BharatERP
 * @created 2026-02-16
 */

import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SiteOwnerGuard } from './site-owner.guard';

function mockContext(input: {
  method?: string;
  path?: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: input.method || 'GET',
        originalUrl: input.path || '/api/sites/site_1',
        params: input.params || {},
        headers: input.headers || {},
        body: input.body || {},
        query: input.query || {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('SiteOwnerGuard', () => {
  const originalEnforce = process.env.ENFORCE_SITE_OWNER;
  const originalAutoClaim = process.env.AUTO_CLAIM_SITE_OWNER;

  afterEach(() => {
    process.env.ENFORCE_SITE_OWNER = originalEnforce;
    process.env.AUTO_CLAIM_SITE_OWNER = originalAutoClaim;
    jest.restoreAllMocks();
  });

  it('allows requests when owner enforcement is disabled', async () => {
    process.env.ENFORCE_SITE_OWNER = 'false';
    const repository = { findOne: jest.fn(), save: jest.fn() };
    const guard = new SiteOwnerGuard({ getRepository: () => repository } as any);

    await expect(
      guard.canActivate(mockContext({ method: 'POST', path: '/api/sites/site_1/pages', params: { siteId: 'site_1' } })),
    ).resolves.toBe(true);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('rejects protected route when actor header is missing', async () => {
    process.env.ENFORCE_SITE_OWNER = 'true';
    const repository = { findOne: jest.fn(), save: jest.fn() };
    const guard = new SiteOwnerGuard({ getRepository: () => repository } as any);

    await expect(
      guard.canActivate(mockContext({ method: 'POST', path: '/api/sites/site_1/pages', params: { siteId: 'site_1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('auto-claims owner when enabled and site has no owner', async () => {
    process.env.ENFORCE_SITE_OWNER = 'true';
    process.env.AUTO_CLAIM_SITE_OWNER = 'true';
    const repository = {
      findOne: jest.fn().mockResolvedValue({ id: 'site_1', ownerId: null }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const guard = new SiteOwnerGuard({ getRepository: () => repository } as any);

    await expect(
      guard.canActivate(
        mockContext({
          method: 'POST',
          path: '/api/sites/site_1/pages',
          params: { siteId: 'site_1' },
          headers: { 'x-actor-id': 'actor_1' },
        }),
      ),
    ).resolves.toBe(true);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'actor_1' }));
  });

  it('rejects actor mismatch when owner differs', async () => {
    process.env.ENFORCE_SITE_OWNER = 'true';
    const repository = {
      findOne: jest.fn().mockResolvedValue({ id: 'site_1', ownerId: 'actor_1' }),
      save: jest.fn(),
    };
    const guard = new SiteOwnerGuard({ getRepository: () => repository } as any);

    await expect(
      guard.canActivate(
        mockContext({
          method: 'POST',
          path: '/api/sites/site_1/pages',
          params: { siteId: 'site_1' },
          headers: { 'x-actor-id': 'actor_2' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows public non-site GET routes without actor header', async () => {
    process.env.ENFORCE_SITE_OWNER = 'true';
    const repository = { findOne: jest.fn(), save: jest.fn() };
    const guard = new SiteOwnerGuard({ getRepository: () => repository } as any);

    await expect(guard.canActivate(mockContext({ method: 'GET', path: '/api/domains/resolve' }))).resolves.toBe(true);
    expect(repository.findOne).not.toHaveBeenCalled();
  });
});

