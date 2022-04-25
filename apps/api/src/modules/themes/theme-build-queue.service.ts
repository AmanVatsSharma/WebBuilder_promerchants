/**
 * File: apps/api/src/modules/themes/theme-build-queue.service.ts
 * Module: themes
 * Purpose: Async build queue for theme builds (keeps heavy work out of request path)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Durable queue via BullMQ + worker processor.
 * - ThemeBuildJob is the durable API-facing ledger for job status.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ThemeBuildService } from './theme-build.service';
import { ThemeVersion } from './entities/theme-version.entity';
import { ThemeBuildJob, type ThemeBuildJobStatus } from './entities/theme-build-job.entity';
import { THEME_BUILD_QUEUE_NAME } from '../../shared/queue/queue.constants';
import { LoggerService } from '../../shared/logger/logger.service';

type PublicBuildJob = {
  jobId: string;
  themeVersionId: string;
  status: ThemeBuildJobStatus;
  queuedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  error?: string | null;
};

function parseIntSafe(v: string | undefined, fallback: number) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class ThemeBuildQueueService {
  constructor(
    // buildSvc is intentionally unused here; worker does the heavy lifting.
    // We keep it injected so older wiring/tests that expect it still compile.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly buildSvc: ThemeBuildService,
    @InjectRepository(ThemeVersion) private readonly versionRepo: Repository<ThemeVersion>,
    @InjectRepository(ThemeBuildJob) private readonly buildJobRepo: Repository<ThemeBuildJob>,
    @InjectQueue(THEME_BUILD_QUEUE_NAME) private readonly queue: Queue,
    private readonly logger: LoggerService,
  ) {}

  async enqueue(themeVersionId: string, requestId?: string | null): Promise<PublicBuildJob> {
    const v = await this.versionRepo.findOne({ where: { id: themeVersionId } });
    if (!v) throw new NotFoundException(`ThemeVersion not found: ${themeVersionId}`);

    // Idempotency: if there is already an active job, return it.
    const existing = await this.buildJobRepo.findOne({
      where: [
        { themeVersionId, status: 'QUEUED' },
        { themeVersionId, status: 'RUNNING' },
      ],
      order: { queuedAt: 'DESC' },
    });
    if (existing) {
      return this.toPublic(existing);
    }

    v.status = 'QUEUED';
    await this.versionRepo.save(v);

    const maxAttempts = parseIntSafe(process.env.THEME_BUILD_MAX_ATTEMPTS, 3);
    const saved = await this.buildJobRepo.save(
      this.buildJobRepo.create({
        themeVersionId,
        status: 'QUEUED',
        attempt: 0,
        maxAttempts,
        requestId: requestId ?? null,
        startedAt: null,
        finishedAt: null,
        durationMs: null,
        errorMessage: null,
        errorStack: null,
        bullJobId: null,
      }),
    );

    const bullJob = await this.queue.add(
      THEME_BUILD_QUEUE_NAME,
      { themeVersionId, themeBuildJobId: saved.id, requestId: requestId ?? null },
      {
        attempts: maxAttempts,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    await this.buildJobRepo.update(saved.id, { bullJobId: String(bullJob.id) });

    this.logger.info('theme build enqueued', {
      themeBuildJobId: saved.id,
      themeVersionId,
      bullJobId: String(bullJob.id),
      requestId: requestId ?? null,
    });
    return this.toPublic({ ...saved, bullJobId: String(bullJob.id) } as ThemeBuildJob);
  }

  async getJob(jobId: string): Promise<PublicBuildJob> {
    const job = await this.buildJobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Build job not found: ${jobId}`);
    return this.toPublic(job);
  }

  private toPublic(job: ThemeBuildJob): PublicBuildJob {
    return {
      jobId: job.id,
      themeVersionId: job.themeVersionId,
      status: job.status,
      queuedAt: job.queuedAt?.toISOString?.() ?? new Date().toISOString(),
      startedAt: job.startedAt ? job.startedAt.toISOString() : null,
      finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
      durationMs: job.durationMs ?? null,
      error: job.errorMessage ?? null,
    };
  }
}

