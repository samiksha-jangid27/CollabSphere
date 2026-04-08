// ABOUTME: Zod validation schemas for auth endpoints — phone E.164, OTP 6 digits, email format.
// ABOUTME: Used by the generic validate middleware to reject malformed requests early.

import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z
      .string({ error: 'Phone number is required' })
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g. +919876543210)'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z
      .string({ error: 'Phone number is required' })
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format'),
    otp: z
      .string({ error: 'OTP is required' })
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
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
