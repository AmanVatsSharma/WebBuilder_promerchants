/**
 * File: apps/api/src/modules/themes/themes.module.ts
 * Module: themes
 * Purpose: Themes module wiring
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Local filesystem storage is used until StorageProvider is extracted
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Theme } from './entities/theme.entity';
import { ThemeVersion } from './entities/theme-version.entity';
import { ThemeFile } from './entities/theme-file.entity';
import { ThemeInstall } from './entities/theme-install.entity';
import { ThemePublishAudit } from './entities/theme-publish-audit.entity';
import { ThemeBuildJob } from './entities/theme-build-job.entity';
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';
import { SitesThemeController } from './sites-theme.controller';
import { StorageModule } from '../../shared/storage/storage.module';
import { ThemeBuildService } from './theme-build.service';
import { ThemeBuildQueueService } from './theme-build-queue.service';
import { QueueModule } from '../../shared/queue/queue.module';
import { THEME_BUILD_QUEUE_NAME } from '../../shared/queue/queue.constants';
import { LoggerModule } from '../../shared/logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Theme, ThemeVersion, ThemeFile, ThemeInstall, ThemePublishAudit, ThemeBuildJob]),
    StorageModule,
    LoggerModule,
    QueueModule,
    BullModule.registerQueue({ name: THEME_BUILD_QUEUE_NAME }),
  ],
  controllers: [ThemesController, SitesThemeController],
  providers: [ThemesService, ThemeBuildService, ThemeBuildQueueService],
  exports: [ThemesService, ThemeBuildQueueService],
})
export class ThemesModule {}


