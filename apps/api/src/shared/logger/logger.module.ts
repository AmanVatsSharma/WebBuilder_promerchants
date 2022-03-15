/**
 * @file logger.module.ts
 * @module shared/logger
 * @description Logger module configuration using nestjs-pino
 * @author BharatERP
 * @created 2025-02-09
 */
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { LoggerService } from './logger.service';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
        autoLogging: true,
        genReqId: (req, res) => {
          // Reuse inbound correlation id if provided; otherwise generate a new one.
          const header = req.headers?.['x-request-id'];
          const requestId = (typeof header === 'string' && header.trim()) ? header.trim() : randomUUID();
          res.setHeader('x-request-id', requestId);
          return requestId;
        },
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
  providers: [LoggerService],
  exports: [PinoLoggerModule, LoggerService],
})
export class LoggerModule {}

