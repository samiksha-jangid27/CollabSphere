// ABOUTME: Standardized API response helpers matching the CollabSphere response shape contract.
// ABOUTME: All controllers use these to ensure consistent { success, data, message } / { success, error } format.

import { Response } from 'express';
import { HTTP_STATUS } from './constants';
import { AppError } from './errors';

export function sendSuccess(
  res: Response,
  data: unknown,
  message: string,
  statusCode: number = HTTP_STATUS.OK,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(res: Response, error: AppError | Error): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
