/**
 * @file logger.module.ts
 * @module shared/logger
 * @description Logger module configuration using nestjs-pino
 * @author BharatERP
 * @created 2025-02-09
 */
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
        autoLogging: true,
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}

