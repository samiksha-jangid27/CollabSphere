// ABOUTME: Search route definitions — public endpoints (no auth) for discovery.
// ABOUTME: Mounted at /api/v1/search in index.ts.

import { Router } from 'express';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchRepository } from './search.repository';
import { validate } from '../../middleware/validate';
import { searchProfilesSchema, searchCitiesSchema } from './search.validation';

const repo = new SearchRepository();
const service = new SearchService(repo);
const controller = new SearchController(service);

const router = Router();

router.get('/profiles', validate(searchProfilesSchema), controller.searchProfiles);
router.get('/cities', validate(searchCitiesSchema), controller.searchCities);

export default router;
