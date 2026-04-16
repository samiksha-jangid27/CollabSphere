// ABOUTME: Zod validation schemas for auth endpoints — username, password, email, role.
// ABOUTME: Used by the generic validate middleware to reject malformed requests early.

import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string({ error: 'Username is required' })
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters'),
    password: z
      .string({ error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters'),
    role: z
      .enum(['creator', 'brand'], { error: 'Role must be either creator or brand' }),
    email: z
      .string({ error: 'Email is required' })
      .email('Invalid email format')
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z
      .string({ error: 'Username is required' }),
    password: z
      .string({ error: 'Password is required' }),
  }),
});

export const sendEmailSchema = z.object({
  body: z.object({
    email: z
      .string({ error: 'Email is required' })
      .email('Invalid email format'),
  }),
});

export const verifyEmailParamsSchema = z.object({
  params: z.object({
    token: z.string({ error: 'Token is required' }).min(1),
  }),
});
