// ABOUTME: Shared Profile TypeScript types mirroring the server Profile model shape.
// ABOUTME: Imported by profileService, hooks, and all profile UI components.

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number];
  city?: string;
  state?: string;
  country?: string;
}

export interface CollaborationPreferences {
  types: string[];
  openToCollab: boolean;
  preferredPlatforms: string[];
}

export interface ContactInfo {
  email?: string;
  website?: string;
  whatsapp?: string;
  visibility: 'public' | 'connections' | 'hidden';
}

export interface Profile {
  _id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  niche: string[];
  interests: string[];
  contentTypes: string[];
  collaborationPreferences: CollaborationPreferences;
  contactInfo: ContactInfo;
  location?: GeoLocation;
  isVerified: boolean;
  verifiedAt?: string;
  followerCount: number;
  profileCompleteness: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  displayName: string;
  bio?: string;
  niche?: string[];
  interests?: string[];
  contentTypes?: string[];
  collaborationPreferences?: CollaborationPreferences;
  contactInfo?: ContactInfo;
  location?: GeoLocation;
}

export type UpdateProfileInput = Partial<CreateProfileInput>;
