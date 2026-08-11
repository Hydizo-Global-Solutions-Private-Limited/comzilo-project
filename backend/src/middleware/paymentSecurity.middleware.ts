import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../shared/errors/AppError';
import { logger } from '../shared/logging/logger';

// In-memory cache for anti-replay nonces and idempotency keys
const processedNonces = new Set<string>();
const processedIdempotencyKeys = new Set<string>();

// Cleanup stale nonces every 10 minutes
setInterval(
  () => {
    processedNonces.clear();
  },
  10 * 60 * 1000
);

/**
 * Customer Data Scoping Guard
 * Verifies that a customer cannot access another customer's payments/invoices
 */
export const verifyCustomerIsolation = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const requestCustomerId =
      req.query.customerId || req.body?.customerId || req.headers['x-customer-id'];
    const authUser = req.user;

    // Super Admin can access all customers
    if (authUser?.role === 'super_admin' || authUser?.role === 'admin') {
      return next();
    }

    if (requestCustomerId && authUser && String(authUser.id) !== String(requestCustomerId)) {
      logger.warn(
        `[SECURITY AUDIT] Unauthorized Customer Access Attempt: User #${authUser.id} tried accessing Customer #${requestCustomerId}`
      );
      throw new ForbiddenError(
        "Access Denied: You cannot view or modify another customer's payment records."
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Seller Data Scoping Guard
 * Verifies that a seller cannot access another seller's wallet or settlements
 */
export const verifySellerIsolation = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const requestTenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId;
    const authTenantId = req.context?.tenantId;
    const authUser = req.user;

    // Super Admin can access all seller tenants
    if (authUser?.role === 'super_admin' || authUser?.role === 'admin') {
      return next();
    }

    if (requestTenantId && authTenantId && String(requestTenantId) !== String(authTenantId)) {
      logger.warn(
        `[SECURITY AUDIT] Unauthorized Seller Access Attempt: Tenant #${authTenantId} tried accessing Tenant #${requestTenantId}`
      );
      throw new ForbiddenError(
        "Access Denied: You cannot view or modify another seller's financial records."
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Razorpay Webhook HMAC Signature Guard
 * Validates X-Razorpay-Signature header
 */
export const verifyRazorpayWebhookSignature = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      'gjwzI3mm19CcyaShfXgheJSR';

    if (!signature) {
      // If signature header is missing, require authorization token or reject
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedError(
          'Webhook Authorization Failed: Missing X-Razorpay-Signature header'
        );
      }
      return next();
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn(
        `[SECURITY AUDIT] Invalid Razorpay Webhook Signature Detected! Received: ${signature}`
      );
      throw new UnauthorizedError('Webhook Authorization Failed: Invalid HMAC SHA256 Signature');
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Duplicate Payment Prevention Guard (Idempotency Key Check)
 */
export const preventDuplicatePayments = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const idempotencyKey = (req.headers['x-idempotency-key'] || req.body?.idempotencyKey) as string;

    if (idempotencyKey) {
      if (processedIdempotencyKeys.has(idempotencyKey)) {
        logger.warn(`[SECURITY AUDIT] Duplicate Payment Attempt Blocked! Key: ${idempotencyKey}`);
        throw new ValidationError(
          `Duplicate Payment Execution Blocked: Request with Idempotency Key '${idempotencyKey}' was already processed.`
        );
      }
      processedIdempotencyKeys.add(idempotencyKey);
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Replay Attack Protection Guard
 * Rejects requests older than 300 seconds or duplicate nonces
 */
export const preventReplayAttacks = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const timestampHeader = req.headers['x-request-timestamp'] as string;
    const nonceHeader = req.headers['x-nonce'] as string;

    if (nonceHeader) {
      if (processedNonces.has(nonceHeader)) {
        logger.warn(`[SECURITY AUDIT] Replay Attack Blocked! Duplicate Nonce: ${nonceHeader}`);
        throw new UnauthorizedError(
          'Replay Attack Protection: Request nonce has already been used.'
        );
      }
      processedNonces.add(nonceHeader);
    }

    if (timestampHeader) {
      const reqTime = parseInt(timestampHeader, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      // Allow max 300s (5 minutes) skew
      if (Math.abs(currentTime - reqTime) > 300) {
        logger.warn(`[SECURITY AUDIT] Stale Request Blocked! Skew: ${currentTime - reqTime}s`);
        throw new UnauthorizedError(
          'Replay Attack Protection: Request timestamp is stale (outside 300s window).'
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};
