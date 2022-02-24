/**
 * File: apps/api/src/modules/themes/theme-build-queue.service.ts
 * Module: themes
 * Purpose: Async build queue for theme builds (keeps heavy work out of request path)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - This is an in-memory queue (single-process) for now.
 * - Next enterprise step: move to a durable queue/worker (BullMQ/Rabbit/SQS) + multi-node safety.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ThemeBuildService } from './theme-build.service';
import { ThemeVersion } from './entities/theme-version.entity';

type BuildJob = {
  jobId: string;
  themeVersionId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

@Injectable()
export class ThemeBuildQueueService {
  private readonly logger = new Logger(ThemeBuildQueueService.name);
  private readonly queue: string[] = [];
  private readonly jobs = new Map<string, BuildJob>();
  private processing = false;

  constructor(
    private readonly buildSvc: ThemeBuildService,
    @InjectRepository(ThemeVersion) private readonly versionRepo: Repository<ThemeVersion>,
  ) {}

  async enqueue(themeVersionId: string) {
    const v = await this.versionRepo.findOne({ where: { id: themeVersionId } });
    if (!v) throw new NotFoundException(`ThemeVersion not found: ${themeVersionId}`);

    const job: BuildJob = {
      jobId: randomUUID(),
      themeVersionId,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.jobId, job);
    this.queue.push(job.jobId);

    v.status = 'QUEUED';
    await this.versionRepo.save(v);

    this.logger.log(`enqueue jobId=${job.jobId} themeVersionId=${themeVersionId}`);
    void this.drain();
    return job;
  }

  getJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException(`Build job not found: ${jobId}`);
    return job;
  }

  private async drain() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length) {
        const jobId = this.queue.shift()!;
        const job = this.jobs.get(jobId);
        if (!job) continue;

        job.status = 'RUNNING';
        job.startedAt = new Date().toISOString();
        this.logger.log(`start jobId=${jobId} themeVersionId=${job.themeVersionId}`);

        try {
          const res = await this.buildSvc.buildThemeVersion(job.themeVersionId);
          if (res?.status === 'FAILED') {
            job.status = 'FAILED';
            job.error = res.error || 'Build failed';
          } else {
            job.status = 'SUCCEEDED';
          }
          job.finishedAt = new Date().toISOString();
          if (job.status === 'FAILED') {
            this.logger.error(`failed jobId=${jobId} themeVersionId=${job.themeVersionId} ${job.error}`);
          } else {
            this.logger.log(`success jobId=${jobId} themeVersionId=${job.themeVersionId}`);
          }
        } catch (e: any) {
          job.status = 'FAILED';
          job.error = e?.message || String(e);
          job.finishedAt = new Date().toISOString();
          this.logger.error(`failed jobId=${jobId} themeVersionId=${job.themeVersionId} ${job.error}`);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

