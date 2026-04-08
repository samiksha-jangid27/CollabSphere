// ABOUTME: Core authentication business logic — OTP login, email verification, token rotation, logout.
// ABOUTME: Implements IAuthService with constructor injection for testability (SOLID: DIP).

import bcrypt from 'bcryptjs';
import { IAuthService, ITokenService, IOtpProvider, IEmailProvider } from './auth.interfaces';
import { AuthRepository } from './auth.repository';
import { IUser } from '../../models/User';
import { OTP, ROLES } from '../../shared/constants';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { eventBus, APP_EVENTS } from '../../shared/EventBus';
import logger from '../../shared/logger';

export class AuthService implements IAuthService {
  constructor(
    private authRepo: AuthRepository,
    private tokenService: ITokenService,
    private otpProvider: IOtpProvider,
    private emailProvider: IEmailProvider,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string; isNewUser: boolean }> {
    let user = await this.authRepo.findByPhone(phone);
    let isNewUser = false;

    if (user?.isBanned) {
      throw AppError.forbidden('Account is banned', ERROR_CODES.ACCOUNT_BANNED);
    }

    if (user?.otp?.lockedUntil && user.otp.lockedUntil > new Date()) {
      throw AppError.forbidden('Account locked due to too many failed attempts', ERROR_CODES.ACCOUNT_LOCKED);
    }

    // Rate limiting: max 3 OTP requests per 15 minutes
    if (user?.otp?.lastRequestAt) {
      const windowStart = new Date(Date.now() - OTP.RATE_WINDOW_MS);
      if (user.otp.lastRequestAt > windowStart && user.otp.requestCount >= OTP.MAX_REQUESTS) {
        throw AppError.tooManyRequests(
          'Too many OTP requests. Please wait before trying again.',
          ERROR_CODES.OTP_RATE_LIMITED,
        );
      }
    }

    if (!user) {
      user = await this.authRepo.create({
        phone,
        role: ROLES.CREATOR,
      } as Partial<IUser>);
      isNewUser = true;
      await eventBus.emit(APP_EVENTS.USER_REGISTERED, { userId: user._id, phone });
    }

    // Generate OTP
    const otpCode = this.generateOtpCode();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    // Calculate request count
    const windowStart = new Date(Date.now() - OTP.RATE_WINDOW_MS);
    const requestCount =
      user.otp?.lastRequestAt && user.otp.lastRequestAt > windowStart
        ? (user.otp.requestCount || 0) + 1
        : 1;

    await this.authRepo.setOtp(user._id.toString(), {
      code: hashedOtp,
      expiresAt: new Date(Date.now() + OTP.TTL_MS),
      attempts: 0,
      requestCount,
      lastRequestAt: new Date(),
    });

    await this.otpProvider.sendOtp(phone, otpCode);
    await eventBus.emit(APP_EVENTS.OTP_SENT, { phone });

    return { message: 'OTP sent successfully', isNewUser };
  }

  async verifyOtp(
    phone: string,
    otp: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    const user = await this.authRepo.findByPhoneWithOtp(phone);

    if (!user) {
      throw AppError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.isBanned) {
      throw AppError.forbidden('Account is banned', ERROR_CODES.ACCOUNT_BANNED);
    }

    if (!user.otp?.code) {
      throw AppError.badRequest('No OTP requested for this phone', ERROR_CODES.AUTH_INVALID_OTP);
    }

    // Check lockout
    if (user.otp.lockedUntil && user.otp.lockedUntil > new Date()) {
      throw AppError.forbidden(
        'Account locked due to too many failed attempts',
        ERROR_CODES.AUTH_OTP_LOCKED,
      );
    }

    // Check expiry
    if (user.otp.expiresAt < new Date()) {
      throw AppError.unauthorized('OTP has expired', ERROR_CODES.AUTH_OTP_EXPIRED);
    }

    // Compare OTP
    const isValid = await bcrypt.compare(otp, user.otp.code);

    if (!isValid) {
      const attempts = await this.authRepo.incrementOtpAttempts(user._id.toString());

      if (attempts >= OTP.MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + OTP.LOCKOUT_MS);
        await this.authRepo.lockOtp(user._id.toString(), lockUntil);
        throw AppError.forbidden(
          'Account locked for 30 minutes due to too many failed attempts',
          ERROR_CODES.AUTH_OTP_LOCKED,
        );
      }

      throw AppError.unauthorized('Invalid OTP', ERROR_CODES.AUTH_INVALID_OTP);
    }

    // Success — clear OTP and set verified
    await this.authRepo.clearOtp(user._id.toString());
    await this.authRepo.setPhoneVerified(user._id.toString());

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user._id.toString(),
    });

    // Store hashed refresh token
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.authRepo.updateRefreshToken(user._id.toString(), hashedRefresh);

    // Refresh user data
    const updatedUser = await this.authRepo.findById(user._id.toString());

    return {
      accessToken,
      refreshToken,
      user: updatedUser!,
    };
  }

  async sendEmailVerification(
    userId: string,
    email: string,
  ): Promise<{ message: string }> {
    const user = await this.authRepo.findById(userId);

    if (!user) {
      throw AppError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.emailVerified && user.email === email) {
      throw AppError.conflict('Email already verified', ERROR_CODES.AUTH_EMAIL_ALREADY_VERIFIED);
    }

    // Update email on user
    await this.authRepo.setEmailAndVerificationStatus(userId, email, false);

    const token = this.tokenService.generateEmailToken({ userId, email });
    await this.emailProvider.sendVerificationEmail(email, token);

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const decoded = this.tokenService.verifyEmailToken(token);
    const user = await this.authRepo.findById(decoded.userId);

    if (!user) {
      throw AppError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.emailVerified) {
      throw AppError.conflict('Email already verified', ERROR_CODES.AUTH_EMAIL_ALREADY_VERIFIED);
    }

    await this.authRepo.setEmailVerified(decoded.userId);
    await eventBus.emit(APP_EVENTS.EMAIL_VERIFIED, { userId: decoded.userId, email: decoded.email });

    return { message: 'Email verified successfully' };
  }

  async refreshTokens(
    currentRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = this.tokenService.verifyRefreshToken(currentRefreshToken);
    const user = await this.authRepo.findByIdWithRefreshToken(decoded.userId);

    if (!user || !user.refreshToken) {
      throw AppError.unauthorized('Invalid refresh token', ERROR_CODES.AUTH_INVALID_TOKEN);
    }

    if (user.isBanned) {
      throw AppError.forbidden('Account is banned', ERROR_CODES.ACCOUNT_BANNED);
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Account is deactivated', ERROR_CODES.AUTH_INVALID_TOKEN);
    }

    // Compare stored hash with provided token
    const isValid = await bcrypt.compare(currentRefreshToken, user.refreshToken);
    if (!isValid) {
      // Possible token theft — invalidate all sessions
      await this.authRepo.updateRefreshToken(decoded.userId, null);
      logger.warn(`Refresh token mismatch for user ${decoded.userId} — possible token theft`);
      throw AppError.unauthorized('Invalid refresh token', ERROR_CODES.AUTH_INVALID_TOKEN);
    }

    // Rotate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const newRefreshToken = this.tokenService.generateRefreshToken({
      userId: user._id.toString(),
    });

    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);
    await this.authRepo.updateRefreshToken(user._id.toString(), hashedRefresh);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.authRepo.updateRefreshToken(userId, null);
  }

  async getCurrentUser(userId: string): Promise<IUser> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    }
    return user;
  }

  private generateOtpCode(): string {
    const min = Math.pow(10, OTP.LENGTH - 1);
    const max = Math.pow(10, OTP.LENGTH) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
}
