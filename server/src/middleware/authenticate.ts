// ABOUTME: JWT authentication middleware — extracts Bearer token, verifies, attaches user to request.
// ABOUTME: Protected routes use this to ensure only authenticated users can access them.

import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../modules/auth/token.service';
import { AppError, ERROR_CODES } from '../shared/errors';

const tokenService = new TokenService();

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(AppError.unauthorized('No token provided', ERROR_CODES.AUTH_INVALID_TOKEN));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = tokenService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}
