// ABOUTME: User Mongoose model — the core identity record for authentication and access control.
// ABOUTME: Uses username/password for auth; strips sensitive fields in toJSON.

import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  password: string;
  email?: string;
  emailVerified: boolean;
  role: 'creator' | 'brand' | 'admin';
  isActive: boolean;
  isBanned: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      minlength: [8, 'Password must be at least 8 characters'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['creator', 'brand', 'admin'],
      required: [true, 'Role is required'],
    },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

export const User = model<IUser>('User', userSchema);
