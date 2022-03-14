/**
 * File: apps/api/src/modules/themes/theme-build-metrics.service.ts
 * Module: themes
 * Purpose: Lightweight build metrics aggregator for theme build worker observability
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - This is a minimal in-process aggregator (good for dev + logs).
 * - Future step: export Prometheus metrics and/or push to OTEL collector.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../shared/logger/logger.service';

type MetricsSnapshot = {
  inProgress: number;
  succeeded: number;
  failed: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastFailureMessage?: string;
};

@Injectable()
export class ThemeBuildMetricsService {
  private inProgress = 0;
  private succeeded = 0;
  private failed = 0;
  private lastSuccessAt?: string;
  private lastFailureAt?: string;
  private lastFailureMessage?: string;

  constructor(private readonly logger: LoggerService) {
    // Periodic snapshot logging for quick operational visibility.
    setInterval(() => {
      this.logger.debug('theme build metrics snapshot', this.snapshot());
    }, 60_000).unref();
  }

  onStart() {
    this.inProgress += 1;
  }

  onSuccess(durationMs: number) {
    this.inProgress = Math.max(0, this.inProgress - 1);
    this.succeeded += 1;
    this.lastSuccessAt = new Date().toISOString();
    this.logger.info('theme build succeeded', { durationMs });
  }

  onFailure(durationMs: number, errorMessage: string) {
    this.inProgress = Math.max(0, this.inProgress - 1);
    this.failed += 1;
    this.lastFailureAt = new Date().toISOString();
    this.lastFailureMessage = errorMessage;
    this.logger.warn('theme build failed', { durationMs, errorMessage });
  }

  snapshot(): MetricsSnapshot {
    return {
      inProgress: this.inProgress,
      succeeded: this.succeeded,
      failed: this.failed,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastFailureMessage: this.lastFailureMessage,
    };
  }
}

