/**
 * @file app.error.ts
 * @module common/errors
 * @description Base application error class
 * @author BharatERP
 * @created 2025-02-09
 */

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

