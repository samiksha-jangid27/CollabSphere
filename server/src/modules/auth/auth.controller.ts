// ABOUTME: Auth HTTP controller — handles request/response for all authentication endpoints.
// ABOUTME: Delegates business logic to AuthService; uses sendSuccess for consistent responses.

import { Request, Response, NextFunction, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';
import { config } from '../../config/environment';

// Cross-site cookie in prod (Vercel client, separate API origin) requires
// SameSite=None + Secure. In dev we keep SameSite=Strict on a same-origin setup.
const refreshCookieBase: CookieOptions = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? 'none' : 'strict',
  path: '/api/v1',
};

const refreshCookieOptions: CookieOptions = {
  ...refreshCookieBase,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password, role, email } = req.body;
      const result = await this.authService.register(username, password, role, email);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

      sendSuccess(res, { accessToken: result.accessToken, user: result.user }, 'Registration successful');
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const result = await this.authService.login(username, password);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

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

      res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

      sendSuccess(res, { accessToken: result.accessToken }, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(req.user!.userId);

      res.clearCookie('refreshToken', refreshCookieBase);

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
