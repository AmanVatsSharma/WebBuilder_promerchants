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

import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ThemeBuildService } from './theme-build.service';
import { ThemeVersion } from './entities/theme-version.entity';
import { ThemeBuildJob, type ThemeBuildJobStatus } from './entities/theme-build-job.entity';
import { THEME_BUILD_QUEUE_NAME } from '../../shared/queue/queue.constants';
import { LoggerService } from '../../shared/logger/logger.service';
import { isInlineThemeBuildMode } from './theme-build-mode';

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
  private readonly inlineMode = isInlineThemeBuildMode();

  constructor(
    private readonly buildSvc: ThemeBuildService,
    @InjectRepository(ThemeVersion) private readonly versionRepo: Repository<ThemeVersion>,
    @InjectRepository(ThemeBuildJob) private readonly buildJobRepo: Repository<ThemeBuildJob>,
    @Optional() @InjectQueue(THEME_BUILD_QUEUE_NAME) private readonly queue: Queue | undefined,
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

    const maxAttempts = parseIntSafe(process.env.THEME_BUILD_MAX_ATTEMPTS, 3);

    v.status = this.inlineMode ? 'BUILDING' : 'QUEUED';
    await this.versionRepo.save(v);

    const saved = await this.buildJobRepo.save(
      this.buildJobRepo.create({
        themeVersionId,
        status: this.inlineMode ? 'RUNNING' : 'QUEUED',
        attempt: 0,
        maxAttempts,
        requestId: requestId ?? null,
        startedAt: this.inlineMode ? new Date() : null,
        finishedAt: null,
        durationMs: null,
        errorMessage: null,
        errorStack: null,
        bullJobId: null,
      }),
    );

    if (this.inlineMode) {
      return await this.executeInlineBuild(saved.id, themeVersionId, requestId ?? null);
    }

    if (!this.queue) {
      throw new Error('Theme build queue is not configured. Set THEME_BUILD_MODE=inline for local execution.');
    }

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

  private async executeInlineBuild(
    themeBuildJobId: string,
    themeVersionId: string,
    requestId: string | null,
  ): Promise<PublicBuildJob> {
    const startedAt = new Date();
    try {
      const res = await this.buildSvc.buildThemeVersion(themeVersionId);
      const finishedAt = new Date();
      const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());

      if (res?.status === 'FAILED') {
        await this.buildJobRepo.update(themeBuildJobId, {
          status: 'FAILED',
          attempt: 1,
          maxAttempts: 1,
          startedAt,
          finishedAt,
          durationMs,
          requestId,
          errorMessage: res.error || 'Build failed',
          errorStack: null,
        });
      } else {
        await this.buildJobRepo.update(themeBuildJobId, {
          status: 'SUCCEEDED',
          attempt: 1,
          maxAttempts: 1,
          startedAt,
          finishedAt,
          durationMs,
          requestId,
          errorMessage: null,
          errorStack: null,
        });
      }
    } catch (e: any) {
      const finishedAt = new Date();
      const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
      await this.buildJobRepo.update(themeBuildJobId, {
        status: 'FAILED',
        attempt: 1,
        maxAttempts: 1,
        startedAt,
        finishedAt,
        durationMs,
        requestId,
        errorMessage: e?.message || String(e),
        errorStack: e?.stack || null,
      });
    }

    const finalJob = await this.buildJobRepo.findOne({ where: { id: themeBuildJobId } });
    if (!finalJob) {
      throw new NotFoundException(`Inline build job not found: ${themeBuildJobId}`);
    }

    this.logger.info('theme build inline execution complete', {
      themeBuildJobId,
      themeVersionId,
      status: finalJob.status,
      requestId,
    });
    return this.toPublic(finalJob);
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

