// ABOUTME: IProfileService interface — controllers depend on this, not the concrete class.
// ABOUTME: Enables dependency inversion and test substitution.

import { IProfile } from '../../models/Profile';

export interface CreateProfileInput {
  displayName: string;
  bio?: string;
  niche?: string[];
  interests?: string[];
  contentTypes?: string[];
  collaborationPreferences?: IProfile['collaborationPreferences'];
  contactInfo?: IProfile['contactInfo'];
  location?: IProfile['location'];
}

export type UpdateProfileInput = Partial<CreateProfileInput>;

export interface IProfileService {
  createProfile(userId: string, input: CreateProfileInput): Promise<IProfile>;
  getProfileByUserId(userId: string): Promise<IProfile>;
  getProfileById(id: string): Promise<IProfile>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<IProfile>;
  deleteProfile(userId: string): Promise<void>;
  uploadAvatar(userId: string, buffer: Buffer): Promise<string>;
  uploadCover(userId: string, buffer: Buffer): Promise<string>;
  calculateCompleteness(profile: IProfile): number;
}
