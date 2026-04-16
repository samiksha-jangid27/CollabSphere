// ABOUTME: Profile Mongoose model — one profile per user with GeoJSON location and 2dsphere index.
// ABOUTME: Models the public-facing identity layer on top of User.

import { Schema, model, Document, Types } from 'mongoose';
import { PROFILE_CONFIG } from '../shared/constants';

export interface IGeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  city?: string;
  state?: string;
  country?: string;
}

export interface ICollaborationPreferences {
  types: string[];
  openToCollab: boolean;
  preferredPlatforms: string[];
}

export interface IContactInfo {
  email?: string;
  website?: string;
  whatsapp?: string;
  visibility: 'public' | 'connections' | 'hidden';
}

export interface IProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  niche: string[];
  interests: string[];
  contentTypes: string[];
  collaborationPreferences: ICollaborationPreferences;
  contactInfo: IContactInfo;
  location?: IGeoLocation;
  isVerified: boolean;
  verifiedAt?: Date;
  followerCount: number;
  profileCompleteness: number;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<IGeoLocation>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: 'Coordinates must be [lng, lat]',
      },
    },
    city: String,
    state: String,
    country: String,
  },
  { _id: false },
);

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: 60,
    },
    bio: { type: String, maxlength: PROFILE_CONFIG.MAX_BIO_LENGTH },
    avatar: String,
    coverImage: String,
    niche: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    contentTypes: { type: [String], default: [] },
    collaborationPreferences: {
      types: { type: [String], default: [] },
      openToCollab: { type: Boolean, default: true },
      preferredPlatforms: { type: [String], default: [] },
    },
    contactInfo: {
      email: String,
      website: String,
      whatsapp: String,
      visibility: {
        type: String,
        enum: ['public', 'connections', 'hidden'],
        default: 'connections',
      },
    },
    location: locationSchema,
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    followerCount: { type: Number, default: 0 },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

profileSchema.index({ location: '2dsphere' });
profileSchema.index({ 'location.city': 1 });
profileSchema.index({ niche: 1 });
profileSchema.index({ isVerified: 1 });
profileSchema.index({ followerCount: -1 });

export const Profile = model<IProfile>('Profile', profileSchema);
