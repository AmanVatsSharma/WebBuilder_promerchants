/**
 * @file extensions.module.ts
 * @module extensions
 * @description Extensions module wiring
 * @author BharatERP
 * @created 2026-01-24
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../shared/storage/storage.module';
import { LoggerModule } from '../../shared/logger/logger.module';
import { Extension } from './entities/extension.entity';
import { ExtensionVersion } from './entities/extension-version.entity';
import { ExtensionInstall } from './entities/extension-install.entity';
import { ExtensionsService } from './extensions.service';
import { ExtensionsController } from './extensions.controller';
import { SitesExtensionsController } from './sites-extensions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Extension, ExtensionVersion, ExtensionInstall]), StorageModule, LoggerModule],
  controllers: [ExtensionsController, SitesExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService],
})
export class ExtensionsModule {}

