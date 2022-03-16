/**
 * File: apps/api/src/shared/logger/logger.service.ts
 * Module: shared/logger
 * Purpose: Injectable LoggerService wrapper over nestjs-pino (adds context + requestId ergonomics)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Prefer this wrapper in services/controllers instead of console.*.
 * - All logs should include requestId when available for traceability.
 */

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export type LogMeta = Record<string, unknown>;

@Injectable()
export class LoggerService {
  constructor(private readonly pino: PinoLogger) {}

  /**
   * Create a lightweight contextual logger that will always include `context` and optional `requestId`.
   * This avoids mutating global logger context (safer for concurrency).
   */
  with(context: string, requestId?: string) {
    const child = this.pino.logger.child({
      context,
      ...(requestId ? { requestId } : {}),
    });

    return {
      trace: (message: string, meta?: LogMeta) => child.trace(meta ?? {}, message),
      debug: (message: string, meta?: LogMeta) => child.debug(meta ?? {}, message),
      info: (message: string, meta?: LogMeta) => child.info(meta ?? {}, message),
      warn: (message: string, meta?: LogMeta) => child.warn(meta ?? {}, message),
      error: (message: string, meta?: LogMeta) => child.error(meta ?? {}, message),
      fatal: (message: string, meta?: LogMeta) => child.fatal(meta ?? {}, message),
    };
  }

  trace(message: string, meta?: LogMeta) {
    this.pino.trace(meta ?? {}, message);
  }
  debug(message: string, meta?: LogMeta) {
    this.pino.debug(meta ?? {}, message);
  }
  info(message: string, meta?: LogMeta) {
    this.pino.info(meta ?? {}, message);
  }
  warn(message: string, meta?: LogMeta) {
    this.pino.warn(meta ?? {}, message);
  }
  error(message: string, meta?: LogMeta) {
    this.pino.error(meta ?? {}, message);
  }
  fatal(message: string, meta?: LogMeta) {
    this.pino.fatal(meta ?? {}, message);
  }
}

