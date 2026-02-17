/**
 * @file sites.service.spec.ts
 * @module sites
 * @description Unit tests for sites service auth-context aware behavior
 * @author BharatERP
 * @created 2026-02-16
 */

import { SitesService } from './sites.service';

describe('SitesService', () => {
  function buildService() {
    const siteRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const pageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const service = new SitesService(siteRepository as any, pageRepository as any);
    return { service, siteRepository, pageRepository };
  }

  it('should set owner/workspace during site creation from access context', async () => {
    const { service, siteRepository } = buildService();
    siteRepository.create.mockImplementation((value) => value);
    siteRepository.save.mockImplementation(async (value) => value);

    const site = await service.createSite(
      { name: 'Demo Site', domain: 'demo.local' },
      { actorId: 'actor_1', workspaceId: 'ws_1' },
    );

    expect(site.ownerId).toBe('actor_1');
    expect(site.workspaceId).toBe('ws_1');
    expect(siteRepository.save).toHaveBeenCalled();
  });

  it('should list by workspace membership when workspace ids are present', async () => {
    const { service, siteRepository } = buildService();
    siteRepository.find.mockResolvedValue([]);

    await service.findAllSites({ actorId: 'actor_1', workspaceIds: ['ws_1', 'ws_2'] });

    const firstCall = siteRepository.find.mock.calls[0]?.[0];
    expect(firstCall.where.workspaceId).toEqual(expect.objectContaining({ _value: ['ws_1', 'ws_2'] }));
  });
});

