/**
 * File: apps/api/src/modules/themes/tests/theme-build-queue.service.spec.ts
 * Module: themes
 * Purpose: Unit tests for durable ThemeBuildQueueService idempotent enqueue behavior
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Uses sql.js TypeORM in-memory DB; BullMQ Queue is stubbed (no Redis required).
 */

import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ThemeBuildQueueService } from '../theme-build-queue.service';
import { Theme } from '../entities/theme.entity';
import { ThemeFile } from '../entities/theme-file.entity';
import { ThemeVersion } from '../entities/theme-version.entity';
import { ThemeBuildJob } from '../entities/theme-build-job.entity';
import { THEME_BUILD_QUEUE_NAME } from '../../../shared/queue/queue.constants';
import { LoggerService } from '../../../shared/logger/logger.service';

describe('ThemeBuildQueueService', () => {
  let mod: any;
  let svc: ThemeBuildQueueService;
  let versionRepo: Repository<ThemeVersion>;

  const addedJobIds = new Set<string>();
  const queueStub = {
    add: jest.fn(async (_name: string, _data: any, opts: any) => {
      if (opts?.jobId) addedJobIds.add(String(opts.jobId));
      return { id: opts?.jobId ?? 'unknown' };
    }),
    getJob: jest.fn(async (jobId: string) => {
      return addedJobIds.has(String(jobId)) ? { id: String(jobId) } : null;
    }),
  };

  beforeEach(async () => {
    addedJobIds.clear();
    queueStub.add.mockClear();
    queueStub.getJob.mockClear();

    mod = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqljs',
          location: ':memory:',
          autoSave: false,
          entities: [Theme, ThemeVersion, ThemeFile, ThemeBuildJob],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Theme, ThemeVersion, ThemeFile, ThemeBuildJob]),
      ],
      providers: [
        ThemeBuildQueueService,
        {
          provide: getQueueToken(THEME_BUILD_QUEUE_NAME),
          useValue: queueStub,
        },
        {
          provide: LoggerService,
          useValue: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn(), fatal: jest.fn(), with: jest.fn() },
        },
      ],
    }).compile();

    svc = mod.get(ThemeBuildQueueService);
    versionRepo = mod.get(getRepositoryToken(ThemeVersion));
  });

  afterEach(async () => {
    if (mod) await mod.close();
  });

  it('is idempotent: enqueue twice returns same active job and only enqueues once to BullMQ', async () => {
    const themeRepo = (versionRepo.manager.getRepository(Theme) as Repository<Theme>);
    const theme = (await themeRepo.save(themeRepo.create({ name: 'T', description: null, author: null } as any))) as any as Theme;

    const v = (await versionRepo.save(
      versionRepo.create({
        themeId: theme.id,
        version: '1.0.0',
        status: 'DRAFT',
        manifest: null,
        buildLog: null,
      } as any),
    )) as any as ThemeVersion;

    const j1 = await svc.enqueue(v.id, 'req-1');
    const j2 = await svc.enqueue(v.id, 'req-2');

    expect(j1.id).toEqual(j2.id);
    expect(queueStub.add).toHaveBeenCalledTimes(1);
  });
});

