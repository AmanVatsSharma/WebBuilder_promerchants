/**
 * @file global-exception.filter.ts
 * @module common/filters
 * @description Global exception filter for standardized error responses
 * @author BharatERP
 * @created 2025-02-09
 */

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors/app.error';
import { LoggerService } from '../../shared/logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestId = (request as any)?.id || (request.headers as any)?.requestId || request.headers['x-request-id'] || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (exception instanceof AppError) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || exception.message;
      code = 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Always log stack trace + requestId for traceability.
    this.logger.error('request failed', {
      requestId,
      code,
      statusCode: status,
      message,
      stack,
      path: request.url,
      method: request.method,
    });

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    });
  }
}

