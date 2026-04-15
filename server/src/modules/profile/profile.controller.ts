// ABOUTME: ProfileController — HTTP handlers for /api/v1/profiles endpoints.
// ABOUTME: Thin layer: parses req, delegates to service, formats response.

import { Request, Response, NextFunction } from 'express';
import { IProfileService } from './profile.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { HTTP_STATUS } from '../../shared/constants';

export class ProfileController {
  constructor(private readonly service: IProfileService) {}

  createProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.createProfile(req.user!.userId, req.body);
      sendSuccess(res, { profile }, 'Profile created successfully', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getProfileByUserId(req.user!.userId);
      sendSuccess(res, { profile }, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  };

  getProfileById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getProfileById(req.params.id as string);
      sendSuccess(res, { profile }, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  };

  updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, { profile }, 'Profile updated');
    } catch (err) {
      next(err);
    }
  };

  deleteMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteProfile(req.user!.userId);
      sendSuccess(res, null, 'Profile deleted');
    } catch (err) {
      next(err);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No file provided', ERROR_CODES.PROFILE_INVALID_FILE);
      }
      const url = await this.service.uploadAvatar(req.user!.userId, req.file.buffer);
      sendSuccess(res, { avatar: url }, 'Avatar uploaded');
    } catch (err) {
      next(err);
    }
  };

  uploadCover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No file provided', ERROR_CODES.PROFILE_INVALID_FILE);
      }
      const url = await this.service.uploadCover(req.user!.userId, req.file.buffer);
      sendSuccess(res, { coverImage: url }, 'Cover image uploaded');
    } catch (err) {
      next(err);
    }
  };
}
