// ABOUTME: Core authentication business logic — register, login, email verification, token rotation, logout.
// ABOUTME: Implements IAuthService with constructor injection for testability (SOLID: DIP).

import bcrypt from 'bcryptjs';
import { IAuthService, ITokenService, IEmailProvider } from './auth.interfaces';
import { AuthRepository } from './auth.repository';
import { IUser } from '../../models/User';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { eventBus, APP_EVENTS } from '../../shared/EventBus';

export class AuthService implements IAuthService {
  constructor(
    private authRepo: AuthRepository,
    private tokenService: ITokenService,
    private emailProvider: IEmailProvider,
  ) {}

  async register(
    username: string,
    password: string,
    role: 'creator' | 'brand',
    email?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    // Check if username already exists
    const existingUser = await this.authRepo.findByUsername(username);
    if (existingUser) {
      throw AppError.conflict('Username already taken', ERROR_CODES.USER_ALREADY_EXISTS);
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await this.authRepo.findByEmail(email);
      if (existingEmail) {
        throw AppError.conflict('Email already in use', ERROR_CODES.EMAIL_ALREADY_EXISTS);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.authRepo.create({
      username,
      password: hashedPassword,
      role,
      email,
    } as Partial<IUser>);

    await eventBus.emit(APP_EVENTS.USER_REGISTERED, { userId: user._id, username });

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

    // Return user without sensitive fields
    const updatedUser = await this.authRepo.findById(user._id.toString());

    return {
      accessToken,
      refreshToken,
      user: updatedUser!,
    };
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    // Find user by username and include password field
    const user = await this.authRepo.findByUsername(username);

    if (!user) {
      throw AppError.unauthorized('Invalid credentials', ERROR_CODES.AUTH_INVALID_TOKEN);
    }

    if (user.isBanned) {
      throw AppError.forbidden('Account is banned', ERROR_CODES.ACCOUNT_BANNED);
    }

    if (!user.isActive) {
      throw AppError.forbidden('Account is deactivated', ERROR_CODES.AUTH_INVALID_TOKEN);
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid credentials', ERROR_CODES.AUTH_INVALID_TOKEN);
    }

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

    // Return user without sensitive fields
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
}
