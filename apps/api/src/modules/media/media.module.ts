/**
 * File: apps/api/src/modules/media/media.module.ts
 * Module: media
 * Purpose: Nest module for media upload/list/serve
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared/storage/storage.module';
import { LoggerModule } from '../../shared/logger/logger.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [StorageModule, LoggerModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}

