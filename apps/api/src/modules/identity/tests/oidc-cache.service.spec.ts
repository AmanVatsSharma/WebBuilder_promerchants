/**
 * @file oidc-cache.service.spec.ts
 * @module identity
 * @description Unit tests for OIDC cache service behavior
 * @author BharatERP
 * @created 2026-02-16
 */

import { OidcCacheService } from '../oidc-cache.service';

describe('OidcCacheService', () => {
  const originalBackend = process.env.AUTH_OIDC_CACHE_BACKEND;

  beforeEach(() => {
    process.env.AUTH_OIDC_CACHE_BACKEND = 'memory';
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-16T00:00:00.000Z'));
  });

  afterEach(() => {
    process.env.AUTH_OIDC_CACHE_BACKEND = originalBackend;
    jest.useRealTimers();
  });

  it('stores and loads cache entries in memory backend', async () => {
    const service = new OidcCacheService();

    await service.set('identity:oidc:discovery:https://issuer', { issuer: 'https://issuer' }, 60000);
    const value = await service.get('identity:oidc:discovery:https://issuer');

    expect((value as any)?.issuer).toBe('https://issuer');
  });

  it('expires memory entries after ttl window', async () => {
    const service = new OidcCacheService();

    await service.set('identity:oidc:jwks:https://issuer/jwks', { keys: [{ kid: 'k1' }] }, 5000);
    jest.advanceTimersByTime(6000);
    const value = await service.get('identity:oidc:jwks:https://issuer/jwks');

    expect(value).toBeNull();
  });
});

