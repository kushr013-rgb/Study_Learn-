import type { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(err: CustomError, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error Handler]', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An internal server error occurred.';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(status).json({
    message,
    code,
    ...(err.details ? { details: err.details } : {}),
  });
}
