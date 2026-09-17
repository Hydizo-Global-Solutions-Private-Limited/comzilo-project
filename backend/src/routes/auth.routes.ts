/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  requestEmailVerificationSchema,
  verifyEmailSchema,
} from '../validations/auth.validation';

import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

const registerLimiter = isTest
  ? (_req: any, _res: any, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many registration attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });

const loginLimiter = isTest
  ? (_req: any, _res: any, next: any) => next()
  : rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many login attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });

const resetLimiter = isTest
  ? (_req: any, _res: any, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many password reset requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });

const refreshLimiter = isTest
  ? (_req: any, _res: any, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many token refresh requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });

const router = express.Router();
const controller = new AuthController();

// Public Active Stores for Registration Dropdown
router.get('/stores', controller.getPublicStores);

// Registration
router.post(
  '/register',
  tenantResolver,
  registerLimiter,
  validate(registerSchema),
  controller.register
);

// Login
router.post('/login', tenantResolver, loginLimiter, validate(loginSchema), controller.login);

// Logout
router.post('/logout', tenantResolver, controller.logout);

// Logout-All
router.post('/logout-all', tenantResolver, controller.logoutAll);

// Refresh Token Rotation
router.post('/refresh', tenantResolver, refreshLimiter, controller.refresh);

// Request password reset
router.post(
  '/request-password-reset',
  tenantResolver,
  resetLimiter,
  validate(requestPasswordResetSchema),
  controller.requestPasswordReset
);

router.post(
  '/forgot-password',
  tenantResolver,
  resetLimiter,
  validate(requestPasswordResetSchema),
  controller.requestPasswordReset
);

// Validate reset token
router.get('/validate-reset-token', tenantResolver, controller.validateResetToken);

// Reset password
router.post(
  '/reset-password',
  tenantResolver,
  resetLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword
);

// Change password (Requires authenticated session)
router.post(
  '/change-password',
  tenantResolver,
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword
);

// Request email verification OTP (Requires authenticated session)
router.post(
  '/request-email-verification',
  tenantResolver,
  authenticate,
  validate(requestEmailVerificationSchema),
  controller.requestEmailVerification
);

// Verify email with OTP (Requires authenticated session)
router.post(
  '/verify-email',
  tenantResolver,
  authenticate,
  validate(verifyEmailSchema),
  controller.verifyEmail
);

// Fetch & update current user details (Requires authenticated session)
router.get('/me', tenantResolver, authenticate, controller.me);
router.get('/profile', tenantResolver, authenticate, controller.me);
router.put('/profile', tenantResolver, authenticate, controller.updateProfile);

export default router;
