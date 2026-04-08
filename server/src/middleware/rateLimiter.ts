// ABOUTME: Rate limiting middleware using express-rate-limit — configurable per-route limiters.
// ABOUTME: Default API limiter (100/15min) and stricter auth limiter (10/15min).

import rateLimit from 'express-rate-limit';

export function createRateLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      },
    },
  });
}

export const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);
export const authLimiter = createRateLimiter(15 * 60 * 1000, 10);
