import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { logger } from '../shared/logging/logger';
import { env } from '../config/env';
import { HTTP_STATUS, RESPONSE_MESSAGES } from '../shared/constants';

export const errorHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code: string = 'INTERNAL_SERVER_ERROR';
  let message: string = RESPONSE_MESSAGES.INTERNAL_ERROR;
  let errors: unknown[] = [];

  if (
    err instanceof AppError ||
    err?.isOperational ||
    err?.statusCode ||
    err?.name === 'ValidationError'
  ) {
    statusCode = err.statusCode || HTTP_STATUS.BAD_REQUEST;
    code = err.code || 'VALIDATION_ERROR';
    message = err.message || RESPONSE_MESSAGES.VALIDATION_ERROR;
    errors = err.errors || [];
  } else if (err?.isJoi) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = RESPONSE_MESSAGES.VALIDATION_ERROR;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors = err.details.map((detail: any) => ({
      message: detail.message,
      path: detail.path,
    }));
  } else if (
    err.name === 'SequelizeValidationError' ||
    err.name === 'SequelizeUniqueConstraintError'
  ) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'DATABASE_VALIDATION_ERROR';
    message = err.errors?.[0]?.message || 'Database validation constraint failed';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors = err.errors.map((e: any) => ({
      message: e.message,
      path: e.path,
    }));
  }

  // Structured Logging
  if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
    logger.warn(`[AUTH] ${message}`, {
      requestId: req.context?.requestId || 'N/A',
      statusCode,
      errorCode: code,
      method: req.method,
      path: req.path,
    });
  } else {
    logger.error(message, {
      requestId: req.context?.requestId || 'N/A',
      tenantId: req.context?.tenantUuid || null,
      userId: req.context?.authenticatedUserId || null,
      statusCode,
      errorCode: code,
      stack: err.stack,
      method: req.method,
      path: req.path,
    });
  }

  // Ensure internal database detail is not exposed in production
  const finalMessage =
    env.NODE_ENV === 'production' && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? RESPONSE_MESSAGES.INTERNAL_ERROR
      : message;

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(
    JSON.stringify({
      success: false,
      message: finalMessage,
      data: null,
      meta: env.NODE_ENV !== 'production' ? { stack: err.stack } : null,
      errors,
      requestId: req.context?.requestId || 'N/A',
      timestamp: new Date().toISOString(),
      code,
    })
  );
};
export default errorHandler;
