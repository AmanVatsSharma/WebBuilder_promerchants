/**
 * File: apps/api/src/main.worker.ts
 * Module: app
 * Purpose: Worker entrypoint (no HTTP) to process durable background jobs (BullMQ)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Run this as a separate process from the API server for isolation and independent scaling.
 * - Uses WorkerModule so processors don't run in the API HTTP process.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './app/worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const logger = app.get(Logger);
  logger.log('🧵 Worker started (BullMQ processors active)');

  const shutdown = async (signal: string) => {
    logger.warn(`Worker shutdown signal=${signal}`);
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrapWorker();

