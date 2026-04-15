// ABOUTME: Multer middleware — in-memory storage with MIME and size validation.
// ABOUTME: Used by profile routes for avatar and cover image uploads.

import multer from 'multer';
import { UPLOAD_CONFIG } from '../shared/constants';
import { AppError, ERROR_CODES } from '../shared/errors';

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!UPLOAD_CONFIG.ALLOWED_IMAGE_MIME.includes(file.mimetype as any)) {
      cb(
        AppError.badRequest(
          'Only JPEG, PNG, and WEBP images are allowed',
          ERROR_CODES.PROFILE_INVALID_FILE,
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single('image');
