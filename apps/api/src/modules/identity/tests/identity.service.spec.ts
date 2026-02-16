/**
 * @file identity.service.spec.ts
 * @module identity
 * @description Unit tests for identity registration and JWT login flows
 * @author BharatERP
 * @created 2026-02-16
 */

import { IdentityService } from '../identity.service';
import { parseAuthContextFromJwt } from '../../../common/auth/auth-context';

describe('IdentityService', () => {
  const originalSecret = process.env.AUTH_JWT_SECRET;
  const originalTtl = process.env.AUTH_JWT_TTL_SECONDS;

  afterEach(() => {
    process.env.AUTH_JWT_SECRET = originalSecret;
    process.env.AUTH_JWT_TTL_SECONDS = originalTtl;
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

    const service = new IdentityService(userRepo as any, workspaceRepo as any, membershipRepo as any);
    return { service, userRepo, workspaceRepo, membershipRepo };
  }

  it('registers owner with workspace and owner membership', async () => {
    const { service, userRepo, workspaceRepo, membershipRepo } = buildService();
    userRepo.findOne.mockResolvedValue(null);
    userRepo.create.mockImplementation((value) => value);
    userRepo.save.mockImplementation(async (value) => ({ ...value, id: 'user_1' }));
    workspaceRepo.findOne.mockResolvedValue(null);
    workspaceRepo.create.mockImplementation((value) => value);
    workspaceRepo.save.mockImplementation(async (value) => ({ ...value, id: 'ws_1' }));
    membershipRepo.create.mockImplementation((value) => value);
    membershipRepo.save.mockImplementation(async (value) => value);

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
    const { service, userRepo, workspaceRepo, membershipRepo } = buildService();
    process.env.AUTH_JWT_SECRET = 'test-secret';
    process.env.AUTH_JWT_TTL_SECONDS = '600';

    const users: any[] = [];
    const workspaces: any[] = [];
    const memberships: any[] = [];

    userRepo.findOne.mockImplementation(async ({ where }: any) => users.find((u) => u.email === where.email) || null);
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
    const authContext = parseAuthContextFromJwt(result.token, 'test-secret');
    expect(authContext.actorId).toBe('user_1');
    expect(authContext.workspaceIds).toEqual(['ws_1', 'ws_2']);
  });
});

