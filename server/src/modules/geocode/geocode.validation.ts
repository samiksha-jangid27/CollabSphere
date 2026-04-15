// ABOUTME: Zod schema for the geocode search endpoint — validates the q query parameter.
// ABOUTME: Consumed by the validate() middleware on geocode routes.

import { z } from 'zod';

export const searchGeocodeSchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Query must be at least 2 characters').max(120),
  }),
});
