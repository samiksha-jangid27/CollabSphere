// ABOUTME: Cloudinary SDK configuration and upload helper for profile media.
// ABOUTME: Uploads go through in-memory buffer — no filesystem writes.

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from './environment';
import { AppError } from '../shared/errors';
import logger from '../shared/logger';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: 'avatars' | 'covers',
  publicId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `collabsphere/${folder}`,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          if (error) {
            logger.error('Cloudinary upload error', {
              message: error.message,
              http_code: error.http_code,
            });
          }
          reject(AppError.internal('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export { cloudinary };
