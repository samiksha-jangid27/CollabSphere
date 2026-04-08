// ABOUTME: User Mongoose model — the core identity record for authentication and access control.
// ABOUTME: Embeds OTP subdocument for atomic auth operations; strips sensitive fields in toJSON.

import { Schema, model, Document, Types } from 'mongoose';

export interface IOtpData {
  code: string;
  expiresAt: Date;
  attempts: number;
  requestCount: number;
  lastRequestAt: Date;
  lockedUntil?: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  phone: string;
  email?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  role: 'creator' | 'brand' | 'admin';
  isActive: boolean;
  isBanned: boolean;
  refreshToken?: string;
  otp?: IOtpData;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      validate: {
        validator: (v: string) => /^\+[1-9]\d{1,14}$/.test(v),
        message: 'Phone must be in E.164 format (e.g. +919876543210)',
      },
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['creator', 'brand', 'admin'],
      required: [true, 'Role is required'],
    },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    otp: {
      code: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      requestCount: { type: Number, default: 0 },
      lastRequestAt: Date,
      lockedUntil: Date,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

export const User = model<IUser>('User', userSchema);
