// ABOUTME: ProfileService — business logic for profile CRUD, uploads, and completeness scoring.
// ABOUTME: Enforces one profile per user and centralizes media upload side-effects.

import { ProfileRepository } from './profile.repository';
import { IProfileService, CreateProfileInput, UpdateProfileInput } from './profile.interfaces';
import { IProfile } from '../../models/Profile';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { uploadImageBuffer } from '../../config/cloudinary';
import { AuthRepository } from '../auth/auth.repository';

export class ProfileService implements IProfileService {
  constructor(private readonly repo: ProfileRepository, private readonly authRepo?: AuthRepository) {}

  async createProfile(userId: string, input: CreateProfileInput): Promise<IProfile> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw AppError.conflict(
        'A profile already exists for this user',
        ERROR_CODES.PROFILE_ALREADY_EXISTS,
      );
    }

    // Extract role from input if provided
    const { role, ...profileInput } = input as any;

    // Update user role if provided and authRepo is available
    if (role && this.authRepo && ['creator', 'brand', 'admin'].includes(role)) {
      await this.authRepo.updateRole(userId, role);
    }

    const profile = await this.repo.create({ ...profileInput, userId } as any);
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<IProfile> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw AppError.notFound('Profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async getProfileById(id: string): Promise<IProfile> {
    const profile = await this.repo.findById(id);
    if (!profile) {
      throw AppError.notFound('Profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<IProfile> {
    const profile = await this.getProfileByUserId(userId);
    for (const [key, value] of Object.entries(input)) {
      profile.set(key, value);
    }
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return profile;
  }

  async deleteProfile(userId: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    await this.repo.deleteById(profile._id.toString());
  }

  async uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
    const profile = await this.getProfileByUserId(userId);
    const url = await uploadImageBuffer(buffer, 'avatars', profile._id.toString());
    profile.avatar = url;
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return url;
  }

  async uploadCover(userId: string, buffer: Buffer): Promise<string> {
    const profile = await this.getProfileByUserId(userId);
    const url = await uploadImageBuffer(buffer, 'covers', profile._id.toString());
    profile.coverImage = url;
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return url;
  }

  calculateCompleteness(profile: IProfile): number {
    const checks: Array<[boolean, number]> = [
      [!!profile.displayName, 20],
      [!!profile.bio && profile.bio.length >= 20, 20],
      [!!profile.avatar, 20],
      [profile.niche.length > 0, 20],
      [!!profile.location?.coordinates, 20],
    ];
    return checks.reduce((sum, [met, pts]) => sum + (met ? pts : 0), 0);
  }
}
