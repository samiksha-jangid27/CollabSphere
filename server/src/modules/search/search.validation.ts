// ABOUTME: Zod schemas for search query parameters — city, niche, platform filters.
// ABOUTME: Consumed by validate() middleware on search routes.

import { z } from 'zod';

export const searchProfilesSchema = z.object({
  query: z.object({
    city: z.string().max(80).optional(),
    niche: z.string().max(80).optional(),
    platform: z.string().max(80).optional(),
  }),
});

export const searchCitiesSchema = z.object({
  query: z.object({
    q: z.string().max(80).optional(),
  }),
});
