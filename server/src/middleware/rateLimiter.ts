// ABOUTME: Rate limiting middleware using express-rate-limit — configurable per-route limiters.
// ABOUTME: Disabled in development mode (NODE_ENV=development). In production: 100/15min general, 10/15min auth.

import rateLimit from 'express-rate-limit';

function createRateLimiter(windowMs: number, max: number) {
  // Skip rate limiting in development and test
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return (req: any, res: any, next: any) => next();
  }

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
export const geocodeLimiter = createRateLimiter(60 * 1000, 30);
