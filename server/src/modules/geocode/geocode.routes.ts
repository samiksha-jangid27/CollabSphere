// ABOUTME: Geocode route definitions — wires auth, rate-limit, validation, and controller.
// ABOUTME: Mounted at /api/v1/geocode in index.ts.

import { Router } from 'express';
import { GeocodeController } from './geocode.controller';
import { GeocodeService } from './geocode.service';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { geocodeLimiter } from '../../middleware/rateLimiter';
import { searchGeocodeSchema } from './geocode.validation';

const service = new GeocodeService();
const controller = new GeocodeController(service);

const router = Router();

router.get(
  '/',
  authenticate,
  geocodeLimiter,
  validate(searchGeocodeSchema),
  controller.search,
);

export default router;
