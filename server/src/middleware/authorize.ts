// ABOUTME: Role-based authorization middleware factory — restricts routes to specified roles.
// ABOUTME: Used after authenticate middleware to enforce role-based access control.

import { Request, Response, NextFunction } from 'express';
import { AppError, ERROR_CODES } from '../shared/errors';

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(AppError.unauthorized('Not authenticated', ERROR_CODES.AUTH_INVALID_TOKEN));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('Insufficient permissions', ERROR_CODES.FORBIDDEN));
      return;
    }

    next();
  };
}
