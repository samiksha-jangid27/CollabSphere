// ABOUTME: JWT token generation and verification for access, refresh, and email verification tokens.
// ABOUTME: Implements ITokenService with configurable secrets and expiry from environment config.

import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/environment';
import { ITokenService } from './auth.interfaces';
import { TOKEN_TYPES } from '../../shared/constants';
import { AppError, ERROR_CODES } from '../../shared/errors';

export class TokenService implements ITokenService {
  generateAccessToken(payload: { userId: string; role: string }): string {
    const options: SignOptions = { expiresIn: config.JWT_ACCESS_EXPIRY as any };
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, options);
  }

  generateRefreshToken(payload: { userId: string }): string {
    const options: SignOptions = { expiresIn: config.JWT_REFRESH_EXPIRY as any };
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, options);
  }

  generateEmailToken(payload: { userId: string; email: string }): string {
    const options: SignOptions = { expiresIn: config.JWT_EMAIL_EXPIRY as any };
    return jwt.sign(
      { ...payload, purpose: TOKEN_TYPES.EMAIL_VERIFY },
      config.JWT_EMAIL_SECRET,
      options,
    );
  }

  verifyAccessToken(token: string): { userId: string; role: string } {
    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
        userId: string;
        role: string;
      };
      return { userId: decoded.userId, role: decoded.role };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Access token expired', ERROR_CODES.AUTH_TOKEN_EXPIRED);
      }
      throw AppError.unauthorized('Invalid access token', ERROR_CODES.AUTH_INVALID_TOKEN);
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as {
        userId: string;
      };
      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Refresh token expired', ERROR_CODES.AUTH_TOKEN_EXPIRED);
      }
      throw AppError.unauthorized('Invalid refresh token', ERROR_CODES.AUTH_INVALID_TOKEN);
    }
  }

  verifyEmailToken(token: string): { userId: string; email: string; purpose: string } {
    try {
      const decoded = jwt.verify(token, config.JWT_EMAIL_SECRET) as {
        userId: string;
        email: string;
        purpose: string;
      };
      if (decoded.purpose !== TOKEN_TYPES.EMAIL_VERIFY) {
        throw AppError.badRequest('Invalid token purpose', ERROR_CODES.AUTH_INVALID_TOKEN);
      }
      return decoded;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.badRequest('Email verification token expired', ERROR_CODES.AUTH_TOKEN_EXPIRED);
      }
      throw AppError.badRequest('Invalid email verification token', ERROR_CODES.AUTH_INVALID_TOKEN);
    }
  }
}
