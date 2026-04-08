// ABOUTME: Auth route definitions — wires middleware, validation, and controller for all 7 endpoints.
// ABOUTME: Exported as a configured Express Router mounted at /api/v1/auth in index.ts.

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { TokenService } from './token.service';
import { OtpProvider } from './otp.provider';
import { EmailProvider } from './email.provider';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  sendOtpSchema,
  verifyOtpSchema,
  sendEmailSchema,
  verifyEmailParamsSchema,
} from './auth.validation';

// Dependency injection wiring
const authRepo = new AuthRepository();
const tokenService = new TokenService();
const otpProvider = new OtpProvider();
const emailProvider = new EmailProvider();
const authService = new AuthService(authRepo, tokenService, otpProvider, emailProvider);
const authController = new AuthController(authService);

const router = Router();

router.post('/otp/send', authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/otp/verify', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/email/send', authenticate, validate(sendEmailSchema), authController.sendEmailVerification);
router.get('/email/verify/:token', validate(verifyEmailParamsSchema), authController.verifyEmail);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
