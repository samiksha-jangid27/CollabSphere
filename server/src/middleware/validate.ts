// ABOUTME: Generic Zod validation middleware factory — validates body, params, and query against a schema.
// ABOUTME: Returns 400 with structured error messages on validation failure.

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError, ERROR_CODES } from '../shared/errors';

export function validate(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      next(AppError.badRequest(message, ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    next();
  };
}
