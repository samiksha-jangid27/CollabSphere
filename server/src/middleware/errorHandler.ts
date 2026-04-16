// ABOUTME: Global Express error handler — maps AppError, Mongoose, and JWT errors to standard responses.
// ABOUTME: Last middleware in the stack; catches everything that next(error) propagates.

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { sendError } from '../shared/responseHelper';
import logger from '../shared/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', { error: err.message, stack: err.stack });
    }
    sendError(res, err);
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const appError = AppError.badRequest(err.message, 'VALIDATION_ERROR');
    sendError(res, appError);
    return;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const keyPattern = (err as any).keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : 'field';
    const appError = AppError.conflict(`${field} already exists`, 'CONFLICT');
    sendError(res, appError);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const appError = AppError.unauthorized(err.message, 'AUTH_INVALID_TOKEN');
    sendError(res, appError);
    return;
  }

  // Unknown error
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const appError = AppError.internal('An unexpected error occurred');
  sendError(res, appError);
}
