// ABOUTME: Auth module interfaces — contracts for service, token, and email providers.
// ABOUTME: Controllers depend on these abstractions, not concrete implementations (SOLID: DIP).

import { IUser } from '../../models/User';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  register(username: string, password: string, role: 'creator' | 'brand', email?: string): Promise<{ accessToken: string; refreshToken: string; user: IUser }>;
  login(username: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: IUser }>;
  sendEmailVerification(userId: string, email: string): Promise<{ message: string }>;
  verifyEmail(token: string): Promise<{ message: string }>;
  refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
  logout(userId: string): Promise<void>;
  getCurrentUser(userId: string): Promise<IUser>;
}

export interface IEmailProvider {
  sendVerificationEmail(email: string, token: string): Promise<void>;
}

export interface ITokenService {
  generateAccessToken(payload: { userId: string; role: string }): string;
  generateRefreshToken(payload: { userId: string }): string;
  generateEmailToken(payload: { userId: string; email: string }): string;
  verifyAccessToken(token: string): { userId: string; role: string };
  verifyRefreshToken(token: string): { userId: string };
  verifyEmailToken(token: string): { userId: string; email: string; purpose: string };
}
