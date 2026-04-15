// ABOUTME: ProfileService — business logic for profile CRUD, uploads, and completeness scoring.
// ABOUTME: Enforces one profile per user and centralizes media upload side-effects.

import { ProfileRepository } from './profile.repository';
import { IProfileService, CreateProfileInput, UpdateProfileInput } from './profile.interfaces';
import { IProfile } from '../../models/Profile';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { uploadImageBuffer } from '../../config/cloudinary';

export class ProfileService implements IProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  async createProfile(userId: string, input: CreateProfileInput): Promise<IProfile> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw AppError.conflict(
        'A profile already exists for this user',
        ERROR_CODES.PROFILE_ALREADY_EXISTS,
      );
    }
    const profile = await this.repo.create({ ...input, userId } as any);
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
    Object.assign(profile, input);
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
      [!!profile.displayName, 10],
      [!!profile.bio && profile.bio.length >= 20, 15],
      [!!profile.avatar, 15],
      [!!profile.coverImage, 10],
      [profile.niche.length > 0, 15],
      [profile.interests.length > 0, 10],
      [!!profile.location?.coordinates, 15],
      [profile.contentTypes.length > 0, 10],
    ];
    return checks.reduce((sum, [met, pts]) => sum + (met ? pts : 0), 0);
  }
}
