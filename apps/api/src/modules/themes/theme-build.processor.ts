/**
 * File: apps/api/src/modules/themes/theme-build.processor.ts
 * Module: themes
 * Purpose: BullMQ worker processor for building ThemeVersions asynchronously
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - This runs in the worker process (see main.worker.ts).
 * - Status is persisted to ThemeBuildJob for API visibility and retries.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { THEME_BUILD_QUEUE_NAME } from '../../shared/queue/queue.constants';
import { ThemeBuildService } from './theme-build.service';
import { ThemeBuildJob } from './entities/theme-build-job.entity';
import { ThemeBuildMetricsService } from './theme-build-metrics.service';
import { LoggerService } from '../../shared/logger/logger.service';

type ThemeBuildPayload = {
  themeVersionId: string;
  themeBuildJobId: string;
  requestId: string | null;
};

function parseIntSafe(v: string | undefined, fallback: number) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function now() {
  return new Date();
}

@Processor(THEME_BUILD_QUEUE_NAME, { concurrency: parseIntSafe(process.env.THEME_BUILD_CONCURRENCY, 2) })
export class ThemeBuildProcessor extends WorkerHost {
  constructor(
    private readonly buildSvc: ThemeBuildService,
    @InjectRepository(ThemeBuildJob) private readonly buildJobRepo: Repository<ThemeBuildJob>,
    private readonly metrics: ThemeBuildMetricsService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  /**
   * BullMQ processor entrypoint.
   * Throws on failure to let BullMQ handle retries; DB state is updated each attempt.
   */
  async process(job: Job<ThemeBuildPayload>): Promise<void> {
    const startedAt = now();
    const attempt = (job.attemptsMade ?? 0) + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    const { themeVersionId, themeBuildJobId, requestId } = job.data;

    const log = this.logger.with(ThemeBuildProcessor.name, requestId ?? undefined);
    log.info('theme build process start', {
      jobId: String(job.id),
      themeBuildJobId,
      themeVersionId,
      attempt,
      maxAttempts,
    });

    this.metrics.onStart();

    await this.buildJobRepo.update(themeBuildJobId, {
      status: 'RUNNING',
      attempt,
      maxAttempts,
      startedAt,
      finishedAt: null,
      durationMs: null,
      requestId: requestId ?? null,
      bullJobId: String(job.id),
      errorMessage: null,
      errorStack: null,
    });

    try {
      const res = await this.buildSvc.buildThemeVersion(themeVersionId);
      if (res?.status === 'FAILED') {
        throw new Error(res.error || 'Build failed');
      }

      const finishedAt = now();
      const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());

      await this.buildJobRepo.update(themeBuildJobId, {
        status: 'SUCCEEDED',
        finishedAt,
        durationMs,
      });

      this.metrics.onSuccess(durationMs);

      log.info('theme build process success', {
        jobId: String(job.id),
        themeBuildJobId,
        themeVersionId,
        durationMs,
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      const stack = e?.stack || null;

      const finishedAt = now();
      const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
      const isFinalAttempt = attempt >= maxAttempts;

      // If BullMQ will retry, we keep the job visible as QUEUED again; otherwise mark FAILED.
      await this.buildJobRepo.update(themeBuildJobId, {
        status: isFinalAttempt ? 'FAILED' : 'QUEUED',
        finishedAt: isFinalAttempt ? finishedAt : null,
        durationMs: isFinalAttempt ? durationMs : null,
        errorMessage: msg,
        errorStack: stack,
        startedAt: isFinalAttempt ? startedAt : null,
      });

      this.metrics.onFailure(durationMs, msg);

      log.error('theme build process failed', {
        jobId: String(job.id),
        themeBuildJobId,
        themeVersionId,
        attempt,
        maxAttempts,
        final: isFinalAttempt,
        errorMessage: msg,
        errorStack: stack,
      });

      // Throw to let BullMQ handle retries/backoff.
      throw e;
    }
  }
}

