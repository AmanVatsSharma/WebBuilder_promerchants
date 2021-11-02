/**
 * @file sites.module.ts
 * @module sites
 * @description Sites module configuration
 * @author BharatERP
 * @created 2025-02-09
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { Site } from './entities/site.entity';
import { Page } from './entities/page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Site, Page])],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}

