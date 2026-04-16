// ABOUTME: Auth route definitions — wires middleware, validation, and controller for all 6 endpoints.
// ABOUTME: Exported as a configured Express Router mounted at /api/v1/auth in index.ts.

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { TokenService } from './token.service';
import { EmailProvider } from './email.provider';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  sendEmailSchema,
  verifyEmailParamsSchema,
} from './auth.validation';

// Dependency injection wiring
const authRepo = new AuthRepository();
const tokenService = new TokenService();
const emailProvider = new EmailProvider();
const authService = new AuthService(authRepo, tokenService, emailProvider);
const authController = new AuthController(authService);

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/email/send', authenticate, validate(sendEmailSchema), authController.sendEmailVerification);
router.get('/email/verify/:token', validate(verifyEmailParamsSchema), authController.verifyEmail);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
