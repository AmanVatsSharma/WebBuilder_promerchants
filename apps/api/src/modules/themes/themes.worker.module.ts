/**
 * @file themes.worker.module.ts
 * @module themes
 * @description Themes worker module (registers BullMQ processors only for worker process)
 * @author BharatERP
 * @created 2026-01-24
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from '../../shared/queue/queue.module';
import { THEME_BUILD_QUEUE_NAME } from '../../shared/queue/queue.constants';
import { ThemeVersion } from './entities/theme-version.entity';
import { ThemeBuildJob } from './entities/theme-build-job.entity';
import { ThemeBuildService } from './theme-build.service';
import { ThemeBuildProcessor } from './theme-build.processor';
import { ThemeBuildMetricsService } from './theme-build-metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThemeVersion, ThemeBuildJob]),
    QueueModule,
    BullModule.registerQueue({ name: THEME_BUILD_QUEUE_NAME }),
  ],
  providers: [ThemeBuildService, ThemeBuildProcessor, ThemeBuildMetricsService],
})
export class ThemesWorkerModule {}

