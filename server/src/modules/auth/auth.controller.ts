// ABOUTME: Auth HTTP controller — handles request/response for all authentication endpoints.
// ABOUTME: Delegates business logic to AuthService; uses sendSuccess for consistent responses.

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';

export class AuthController {
  constructor(private authService: AuthService) {}

  sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = req.body;
      const result = await this.authService.sendOtp(phone);
      sendSuccess(res, { phone, isNewUser: result.isNewUser }, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otp } = req.body;
      const result = await this.authService.verifyOtp(phone, otp);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, { accessToken: result.accessToken, user: result.user }, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  sendEmailVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this.authService.sendEmailVerification(req.user!.userId, email);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.params.token as string;
      const result = await this.authService.verifyEmail(token);
      sendSuccess(res, { emailVerified: true }, result.message);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentToken = req.cookies?.refreshToken;
      if (!currentToken) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_INVALID_TOKEN', message: 'No refresh token provided' },
        });
        return;
      }

      const result = await this.authService.refreshTokens(currentToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, { accessToken: result.accessToken }, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(req.user!.userId);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
      });

      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getCurrentUser(req.user!.userId);
      sendSuccess(res, { user }, 'User retrieved');
    } catch (error) {
      next(error);
    }
  };
}
