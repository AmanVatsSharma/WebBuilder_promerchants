/**
 * @file app.module.ts
 * @module app
 * @description Main application module
 * @author BharatERP
 * @created 2025-02-09
 */
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from '../shared/logger/logger.module';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { SitesModule } from '../modules/sites/sites.module';
import { DomainsModule } from '../modules/domains/domains.module';
import { ThemesModule } from '../modules/themes/themes.module';
import { CommerceModule } from '../modules/commerce/commerce.module';

@Module({
  imports: [
    LoggerModule,
    SitesModule,
    DomainsModule,
    ThemesModule,
    CommerceModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'webbuilder',
        entities: [],
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production', // true for dev
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
