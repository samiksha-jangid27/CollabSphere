// ABOUTME: Auth module interfaces — contracts for service, token, OTP, and email providers.
// ABOUTME: Controllers depend on these abstractions, not concrete implementations (SOLID: DIP).

import { IUser } from '../../models/User';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  sendOtp(phone: string): Promise<{ message: string; isNewUser: boolean }>;
  verifyOtp(phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string; user: IUser }>;
  sendEmailVerification(userId: string, email: string): Promise<{ message: string }>;
  verifyEmail(token: string): Promise<{ message: string }>;
  refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
  logout(userId: string): Promise<void>;
  getCurrentUser(userId: string): Promise<IUser>;
}

export interface IOtpProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
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
