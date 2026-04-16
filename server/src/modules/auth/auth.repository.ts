// ABOUTME: Auth-specific repository extending BaseRepository with OTP and token management methods.
// ABOUTME: Encapsulates all User document queries needed by the auth service layer.

import { BaseRepository } from '../../shared/BaseRepository';
import { User, IUser, IOtpData } from '../../models/User';

export class AuthRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    return this.model.findOne({ phone });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.model.findOne({ email });
  }

  async findByIdWithRefreshToken(id: string): Promise<IUser | null> {
    return this.model.findById(id).select('+refreshToken');
  }

  async updateRefreshToken(userId: string, hashedToken: string | null): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      refreshToken: hashedToken,
    });
  }

  async setOtp(userId: string, otpData: Partial<IOtpData>): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        'otp.code': otpData.code,
        'otp.expiresAt': otpData.expiresAt,
        'otp.attempts': otpData.attempts ?? 0,
        'otp.requestCount': otpData.requestCount,
        'otp.lastRequestAt': otpData.lastRequestAt,
      },
    });
  }

  async clearOtp(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, { $unset: { otp: 1 } });
  }

  async incrementOtpAttempts(userId: string): Promise<number> {
    const user = await this.model.findByIdAndUpdate(
      userId,
      { $inc: { 'otp.attempts': 1 } },
      { new: true },
    );
    return user?.otp?.attempts ?? 0;
  }

  async lockOtp(userId: string, until: Date): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: { 'otp.lockedUntil': until },
    });
  }

  async findByPhoneWithOtp(phone: string): Promise<IUser | null> {
    return this.model.findOne({ phone });
  }

  async setEmailAndVerificationStatus(
    userId: string,
    email: string,
    verified: boolean,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      email,
      emailVerified: verified,
    });
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, { emailVerified: true });
  }

  async setPhoneVerified(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, { phoneVerified: true });
  }

  async updateRole(userId: string, role: 'creator' | 'brand' | 'admin'): Promise<void> {
    await this.model.findByIdAndUpdate(userId, { role });
  }
}
