// ABOUTME: Application-wide constants for OTP config, rate limits, API versioning, and token types.
// ABOUTME: Single source of truth for magic numbers — no hardcoded values elsewhere.

export const API_PREFIX = '/api/v1';

export const OTP = {
  LENGTH: 6,
  TTL_MS: 5 * 60 * 1000,           // 5 minutes
  MAX_REQUESTS: 3,
  RATE_WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MS: 30 * 60 * 1000,      // 30 minutes
} as const;

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFY: 'email_verify',
} as const;

export const ROLES = {
  CREATOR: 'creator',
  BRAND: 'brand',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PROFILE_CONFIG = {
  MAX_BIO_LENGTH: 500,
  MAX_NICHE_COUNT: 5,
  MAX_INTERESTS_COUNT: 10,
  ALLOWED_NICHES: [
    'fashion', 'beauty', 'travel', 'food', 'fitness', 'gaming',
    'tech', 'finance', 'education', 'lifestyle', 'music', 'art',
    'photography', 'comedy', 'parenting', 'sports', 'business',
  ] as const,
  ALLOWED_PLATFORMS: ['instagram', 'youtube', 'twitter', 'tiktok', 'linkedin'] as const,
  COLLAB_TYPES: ['paid', 'barter', 'shoutout', 'content', 'event'] as const,
} as const;

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_MIME: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
