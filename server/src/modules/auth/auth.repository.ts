// ABOUTME: Auth-specific repository extending BaseRepository with token and email management methods.
// ABOUTME: Encapsulates all User document queries needed by the auth service layer.

import { BaseRepository } from '../../shared/BaseRepository';
import { User, IUser } from '../../models/User';

export class AuthRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.model.findOne({ username }).select('+password');
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

  async updateRole(userId: string, role: 'creator' | 'brand' | 'admin'): Promise<void> {
    await this.model.findByIdAndUpdate(userId, { role });
  }
}
