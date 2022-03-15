/**
 * File: apps/api/src/modules/themes/tests/theme-build.processor.spec.ts
 * Module: themes
 * Purpose: Unit tests for ThemeBuildProcessor status transitions (success/failure)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Uses sql.js TypeORM in-memory DB; ThemeBuildService + metrics are stubbed.
 */

import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ThemeBuildProcessor } from '../theme-build.processor';
import { ThemeBuildJob } from '../entities/theme-build-job.entity';
import { ThemeVersion } from '../entities/theme-version.entity';
import { Theme } from '../entities/theme.entity';
import { ThemeFile } from '../entities/theme-file.entity';
import { ThemeBuildMetricsService } from '../theme-build-metrics.service';
import { ThemeBuildService } from '../theme-build.service';
import { LoggerService } from '../../../shared/logger/logger.service';

function fakeBullJob(overrides: Partial<any>) {
  return {
    id: 'bull-1',
    data: {
      themeVersionId: 'v1',
      themeBuildJobId: 'j1',
      requestId: null,
    },
    attemptsMade: 0,
    opts: { attempts: 1 },
    ...overrides,
  };
}

describe('ThemeBuildProcessor', () => {
  let mod: any;
  let processor: ThemeBuildProcessor;
  let jobRepo: Repository<ThemeBuildJob>;

  const metricsStub: Partial<ThemeBuildMetricsService> = {
    onStart: jest.fn(),
    onSuccess: jest.fn(),
    onFailure: jest.fn(),
  };

  const loggerStub: Partial<LoggerService> = {
    with: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
    })),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (mod) await mod.close();
  });

  it('marks SUCCEEDED when build succeeds', async () => {
    const buildSvcStub = {
      buildThemeVersion: jest.fn(async (themeVersionId: string) => ({
        themeVersionId,
        status: 'BUILT',
        output: 'themes/v1/build/theme.cjs',
      })),
    } as any;

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
        ThemeBuildProcessor,
        { provide: ThemeBuildService, useValue: buildSvcStub },
        { provide: ThemeBuildMetricsService, useValue: metricsStub },
        { provide: LoggerService, useValue: loggerStub },
      ],
    }).compile();

    processor = mod.get(ThemeBuildProcessor);
    jobRepo = mod.get(getRepositoryToken(ThemeBuildJob));

    const themeRepo = mod.get(getRepositoryToken(Theme)) as Repository<Theme>;
    const versionRepo = mod.get(getRepositoryToken(ThemeVersion)) as Repository<ThemeVersion>;
    const theme = (await themeRepo.save(themeRepo.create({ name: 'T', description: null, author: null } as any))) as any as Theme;
    await versionRepo.save(versionRepo.create({ id: 'v1', themeId: theme.id, version: '1.0.0', status: 'DRAFT' } as any));

    const saved = (await jobRepo.save(
      jobRepo.create({
        id: 'j1',
        themeVersionId: 'v1',
        status: 'QUEUED',
        attempt: 0,
        maxAttempts: 1,
      } as any),
    )) as any as ThemeBuildJob;

    await processor.process(fakeBullJob({ data: { themeVersionId: 'v1', themeBuildJobId: saved.id, requestId: null } }) as any);
    const updated = await jobRepo.findOneByOrFail({ id: saved.id });

    expect(updated.status).toEqual('SUCCEEDED');
    expect((metricsStub.onSuccess as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('marks FAILED and throws when build fails and no retries remain', async () => {
    const buildSvcStub = {
      buildThemeVersion: jest.fn(async (themeVersionId: string) => ({
        themeVersionId,
        status: 'FAILED',
        error: 'boom',
      })),
    } as any;

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
        ThemeBuildProcessor,
        { provide: ThemeBuildService, useValue: buildSvcStub },
        { provide: ThemeBuildMetricsService, useValue: metricsStub },
        { provide: LoggerService, useValue: loggerStub },
      ],
    }).compile();

    processor = mod.get(ThemeBuildProcessor);
    jobRepo = mod.get(getRepositoryToken(ThemeBuildJob));

    const themeRepo = mod.get(getRepositoryToken(Theme)) as Repository<Theme>;
    const versionRepo = mod.get(getRepositoryToken(ThemeVersion)) as Repository<ThemeVersion>;
    const theme = (await themeRepo.save(themeRepo.create({ name: 'T', description: null, author: null } as any))) as any as Theme;
    await versionRepo.save(versionRepo.create({ id: 'v1', themeId: theme.id, version: '1.0.0', status: 'DRAFT' } as any));

    const saved = (await jobRepo.save(
      jobRepo.create({
        id: 'j1',
        themeVersionId: 'v1',
        status: 'QUEUED',
        attempt: 0,
        maxAttempts: 1,
      } as any),
    )) as any as ThemeBuildJob;

    await expect(
      processor.process(
        fakeBullJob({ data: { themeVersionId: 'v1', themeBuildJobId: saved.id, requestId: null }, opts: { attempts: 1 } }) as any,
      ),
    ).rejects.toThrow('boom');

    const updated = await jobRepo.findOneByOrFail({ id: saved.id });
    expect(updated.status).toEqual('FAILED');
    expect(updated.errorMessage).toEqual('boom');
    expect((metricsStub.onFailure as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

