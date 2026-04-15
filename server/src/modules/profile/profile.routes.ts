// ABOUTME: Profile route definitions — wires middleware, validation, upload, and controller.
// ABOUTME: Mounted at /api/v1/profiles in index.ts.

import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfileRepository } from './profile.repository';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { uploadSingleImage } from '../../middleware/upload';
import {
  createProfileSchema,
  updateProfileSchema,
  profileIdParamsSchema,
} from './profile.validation';

const repo = new ProfileRepository();
const service = new ProfileService(repo);
const controller = new ProfileController(service);

const router = Router();

router.post('/', authenticate, validate(createProfileSchema), controller.createProfile);
router.get('/me', authenticate, controller.getMyProfile);
router.patch('/me', authenticate, validate(updateProfileSchema), controller.updateMyProfile);
router.delete('/me', authenticate, controller.deleteMyProfile);
router.post('/me/avatar', authenticate, uploadSingleImage, controller.uploadAvatar);
router.post('/me/cover', authenticate, uploadSingleImage, controller.uploadCover);
router.get('/:id', authenticate, validate(profileIdParamsSchema), controller.getProfileById);

export default router;
