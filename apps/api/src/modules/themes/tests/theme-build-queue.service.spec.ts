/**
 * File: apps/api/src/modules/themes/tests/theme-build-queue.service.spec.ts
 * Module: themes
 * Purpose: Unit tests for ThemeBuildQueueService (in-memory async queue)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Uses sql.js TypeORM in-memory DB; ThemeBuildService is mocked.
 */

import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeBuildQueueService } from '../theme-build-queue.service';
import { Theme } from '../entities/theme.entity';
import { ThemeFile } from '../entities/theme-file.entity';
import { ThemeVersion } from '../entities/theme-version.entity';
import { ThemeBuildService } from '../theme-build.service';

describe('ThemeBuildQueueService', () => {
  let mod: any;
  let svc: ThemeBuildQueueService;
  let versionRepo: Repository<ThemeVersion>;
  const buildSvcMock = {
    buildThemeVersion: jest.fn(async () => ({ status: 'BUILT' })),
  };

  beforeEach(async () => {
    buildSvcMock.buildThemeVersion.mockClear();

    mod = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqljs',
          location: ':memory:',
          autoSave: false,
          entities: [Theme, ThemeVersion, ThemeFile],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Theme, ThemeVersion, ThemeFile]),
      ],
      providers: [
        ThemeBuildQueueService,
        {
          provide: ThemeBuildService,
          useValue: buildSvcMock,
        },
      ],
    }).compile();

    svc = mod.get(ThemeBuildQueueService);
    versionRepo = mod.get(getRepositoryToken(ThemeVersion));
  });

  afterEach(async () => {
    if (mod) await mod.close();
  });

  it('enqueues a build job and exposes it via getJob', async () => {
    const themeRepo = versionRepo.manager.getRepository(Theme);
    const theme = (await themeRepo.save(
      themeRepo.create({ name: 'T', description: null, author: null } as any) as any,
    )) as any as Theme;

    const v = (await versionRepo.save(
      versionRepo.create({
        themeId: theme.id,
        version: '1.0.0',
        status: 'DRAFT',
        manifest: null,
        buildLog: null,
      } as any),
    )) as any as ThemeVersion;

    const job = await svc.enqueue(v.id);
    expect(['QUEUED', 'RUNNING', 'SUCCEEDED']).toContain(job.status);
    expect(typeof job.jobId).toBe('string');

    const loaded = svc.getJob(job.jobId);
    expect(loaded.jobId).toBe(job.jobId);
  });
});

