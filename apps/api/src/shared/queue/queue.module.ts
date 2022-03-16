/**
 * File: apps/api/src/shared/queue/queue.module.ts
 * Module: shared/queue
 * Purpose: Configure BullMQ (Redis-backed durable queue) for the API app
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Imported by AppModule so any module can register queues/processors.
 * - Connection is shared across queues via BullModule.forRoot().
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { buildRedisConnection } from './redis.config';

@Module({
  imports: [
    BullModule.forRoot({
      connection: buildRedisConnection(),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

