// ABOUTME: Zod schemas for profile create, update, and upload endpoints.
// ABOUTME: Consumed by validate() middleware on profile routes.

import { z } from 'zod';
import { PROFILE_CONFIG } from '../../shared/constants';

const locationSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
});

const contactInfoSchema = z.object({
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  whatsapp: z.string().optional(),
  visibility: z.enum(['public', 'connections', 'hidden']).default('connections'),
});

const collaborationPrefsSchema = z.object({
  types: z.array(z.string()).default([]),
  openToCollab: z.boolean().default(true),
  preferredPlatforms: z.array(z.string()).default([]),
});

export const createProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(60),
    bio: z.string().max(PROFILE_CONFIG.MAX_BIO_LENGTH).optional(),
    niche: z.array(z.string()).max(PROFILE_CONFIG.MAX_NICHE_COUNT).default([]),
    interests: z.array(z.string()).max(PROFILE_CONFIG.MAX_INTERESTS_COUNT).default([]),
    contentTypes: z.array(z.string()).default([]),
    collaborationPreferences: collaborationPrefsSchema.optional(),
    contactInfo: contactInfoSchema.optional(),
    location: locationSchema.optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: createProfileSchema.shape.body.partial(),
});

export const profileIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid profile ID'),
  }),
});
