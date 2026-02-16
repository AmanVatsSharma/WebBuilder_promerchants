/**
 * @file identity.service.spec.ts
 * @module identity
 * @description Unit tests for identity registration and JWT login flows
 * @author BharatERP
 * @created 2026-02-16
 */

import { IdentityService } from '../identity.service';
import { parseAuthContextFromJwt, parseAuthContextFromJwtWithKeyring } from '../../../common/auth/auth-context';

describe('IdentityService', () => {
  const originalSecret = process.env.AUTH_JWT_SECRET;
  const originalActiveKid = process.env.AUTH_JWT_ACTIVE_KID;
  const originalSecretsJson = process.env.AUTH_JWT_SECRETS_JSON;
  const originalTtl = process.env.AUTH_JWT_TTL_SECONDS;
  const originalRefreshTtl = process.env.AUTH_REFRESH_TTL_SECONDS;

  afterEach(() => {
    process.env.AUTH_JWT_SECRET = originalSecret;
    process.env.AUTH_JWT_ACTIVE_KID = originalActiveKid;
    process.env.AUTH_JWT_SECRETS_JSON = originalSecretsJson;
    process.env.AUTH_JWT_TTL_SECONDS = originalTtl;
    process.env.AUTH_REFRESH_TTL_SECONDS = originalRefreshTtl;
    jest.restoreAllMocks();
  });

  function buildService() {
    const userRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const workspaceRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const membershipRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    const sessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const service = new IdentityService(userRepo as any, workspaceRepo as any, membershipRepo as any, sessionRepo as any);
    return { service, userRepo, workspaceRepo, membershipRepo, sessionRepo };
  }

  it('registers owner with workspace and owner membership', async () => {
    const { service, userRepo, workspaceRepo, membershipRepo, sessionRepo } = buildService();
    userRepo.findOne.mockResolvedValue(null);
    userRepo.create.mockImplementation((value) => value);
    userRepo.save.mockImplementation(async (value) => ({ ...value, id: 'user_1' }));
    workspaceRepo.findOne.mockResolvedValue(null);
    workspaceRepo.create.mockImplementation((value) => value);
    workspaceRepo.save.mockImplementation(async (value) => ({ ...value, id: 'ws_1' }));
    membershipRepo.create.mockImplementation((value) => value);
    membershipRepo.save.mockImplementation(async (value) => value);
    sessionRepo.create.mockImplementation((value) => value);
    sessionRepo.save.mockImplementation(async (value) => value);

    const result = await service.registerOwner({
      email: 'owner@example.com',
      password: 'password123',
      workspaceName: 'My Workspace',
      name: 'Owner',
    });

    expect(result.user.email).toBe('owner@example.com');
    expect(result.workspace.id).toBe('ws_1');
    expect(membershipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_1', workspaceId: 'ws_1', role: 'OWNER' }),
    );
  });

  it('issues JWT with workspace ids on login', async () => {
    const { service, userRepo, workspaceRepo, membershipRepo, sessionRepo } = buildService();
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.AUTH_JWT_TTL_SECONDS = '600';
    process.env.AUTH_REFRESH_TTL_SECONDS = '1200';

    const users: any[] = [];
    const workspaces: any[] = [];
    const memberships: any[] = [];
    const sessions: any[] = [];

    userRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.email) return users.find((u) => u.email === where.email) || null;
      if (where?.id) return users.find((u) => u.id === where.id) || null;
      return null;
    });
    userRepo.create.mockImplementation((value) => value);
    userRepo.save.mockImplementation(async (value) => {
      const next = { ...value, id: value.id || `user_${users.length + 1}` };
      users.push(next);
      return next;
    });

    workspaceRepo.findOne.mockResolvedValue(null);
    workspaceRepo.create.mockImplementation((value) => value);
    workspaceRepo.save.mockImplementation(async (value) => {
      const next = { ...value, id: value.id || `ws_${workspaces.length + 1}` };
      workspaces.push(next);
      return next;
    });

    membershipRepo.create.mockImplementation((value) => value);
    membershipRepo.save.mockImplementation(async (value) => {
      const next = { ...value, id: value.id || `m_${memberships.length + 1}` };
      memberships.push(next);
      return next;
    });
    membershipRepo.find.mockImplementation(async ({ where }: any) =>
      memberships.filter((m) => m.userId === where.userId),
    );
    sessionRepo.create.mockImplementation((value) => value);
    sessionRepo.save.mockImplementation(async (value) => {
      if (!value.id) {
        const next = { ...value, id: `s_${sessions.length + 1}` };
        sessions.push(next);
        return next;
      }
      const idx = sessions.findIndex((s) => s.id === value.id);
      if (idx >= 0) sessions[idx] = { ...sessions[idx], ...value };
      return value;
    });
    sessionRepo.findOne.mockImplementation(async ({ where }: any) =>
      sessions.find((s) => s.refreshTokenHash === where.refreshTokenHash) || null,
    );

    await service.registerOwner({
      email: 'owner@example.com',
      password: 'password123',
      workspaceName: 'Workspace One',
      name: 'Owner',
    });
    memberships.push({ id: 'm_extra', userId: 'user_1', workspaceId: 'ws_2', role: 'MEMBER' });

    const result = await service.login({
      email: 'owner@example.com',
      password: 'password123',
    });

    expect(typeof result.token).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    const authContext = parseAuthContextFromJwt(result.token, 'test-secret');
    expect(authContext.actorId).toBe('user_1');
    expect(authContext.workspaceIds).toEqual(['ws_1', 'ws_2']);

    const refreshed = await service.refresh({ refreshToken: result.refreshToken });
    expect(typeof refreshed.token).toBe('string');
    expect(typeof refreshed.refreshToken).toBe('string');
    expect(refreshed.refreshToken).not.toEqual(result.refreshToken);

    await expect(service.refresh({ refreshToken: result.refreshToken })).rejects.toThrow('Invalid refresh token');

    const logoutRes = await service.logout({ refreshToken: refreshed.refreshToken });
    expect(logoutRes.status).toBe('LOGGED_OUT');
    await expect(service.refresh({ refreshToken: refreshed.refreshToken })).rejects.toThrow('Invalid refresh token');
  });

  it('signs token with kid-based keyring when configured', async () => {
    const { service } = buildService();
    process.env.AUTH_JWT_SECRET = '';
    process.env.AUTH_JWT_ACTIVE_KID = 'k1';
    process.env.AUTH_JWT_SECRETS_JSON = JSON.stringify({ k1: 'secret-k1' });

    const token = (service as any).signAuthToken({
      sub: 'user_1',
      workspaceIds: ['ws_1'],
    });

    const authContext = parseAuthContextFromJwtWithKeyring(token, {
      defaultSecret: '',
      secretsByKid: { k1: 'secret-k1' },
    });
    expect(authContext.actorId).toBe('user_1');
    expect(authContext.workspaceIds).toEqual(['ws_1']);
  });
});

