/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import { BaseService } from '../core/BaseService';

function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
          return net.address;
        }
      }
    }
  } catch {
    // fallback
  }
  return '';
}
import {
  User,
  Tenant,
  RefreshToken,
  LoginHistory,
  UserDevice,
  OtpRequest,
  PasswordResetToken,
  UserProfile,
  Customer,
  Role,
  UserRole,
} from '../database/models';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { OtpRequestRepository } from '../repositories/otpRequest.repository';
import { PasswordResetTokenRepository } from '../repositories/passwordResetToken.repository';
import {
  AuthenticationError,
  ValidationError,
  BusinessRuleError,
  NotFoundError,
} from '../shared/errors/AppError';
import { withTransaction } from '../utils/transactions';
import { RequestContext } from '../middleware/requestContext';
import { NotificationService } from './notification.service';
import { SmtpService } from './smtpService';
import { createAuditLog } from '../utils/auditHelper';
import { validatePasswordPolicy } from '../validations/auth.validation';

export class AuthService extends BaseService {
  private readonly userRepository = new UserRepository();
  private readonly refreshTokenRepository = new RefreshTokenRepository();
  private readonly otpRequestRepository = new OtpRequestRepository();
  private readonly resetTokenRepository = new PasswordResetTokenRepository();

  constructor() {
    super('AuthService');
  }

  private hashSHA256(val: string): string {
    return crypto.createHash('sha256').update(val).digest('hex');
  }

  /**
   * Registers a new customer user and profile
   */
  public async register(tenantId: number, data: any, context?: RequestContext): Promise<User> {
    this.logInfo(`Registering user ${data.email} for tenant ${tenantId}`, context);

    // Verify tenant exists
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // If a store slug is provided, verify the store exists in database
    if (data.storeSlug) {
      const [store]: any = await sequelize.query(
        'SELECT id, tenant_id FROM stores WHERE (slug = :slug OR LOWER(name) = LOWER(:slug)) AND status = "active" LIMIT 1',
        { replacements: { slug: data.storeSlug.trim() }, type: QueryTypes.SELECT }
      );
      if (!store) {
        throw new ValidationError(`Store code "${data.storeSlug}" was not found. Please enter a valid seller store code or leave it blank.`);
      }
    }

    // Check duplicate email under this tenant
    const existingUser = await this.userRepository.findByEmail(tenantId, data.email);
    if (existingUser) {
      throw new BusinessRuleError(
        'Email is already registered under this tenant',
        'DUPLICATE_EMAIL'
      );
    }

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    return withTransaction(async (t) => {
      let targetTenantId = tenantId;
      let targetStoreId = data.storeId || context?.storeId;

      // If storeSlug or storeName is provided in registration payload, look up store_id and tenant_id
      const storeInput = (data.storeSlug || data.storeName || '').trim();
      if (storeInput) {
        const slugified = storeInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const fuzzyPattern = `%${storeInput.toLowerCase().replace(/[^a-z0-9]/g, '')}%`;

        const [foundStore]: any = await sequelize.query(
          `SELECT id, tenant_id FROM stores 
           WHERE (
             slug = :slug 
             OR slug = :slugified 
             OR LOWER(name) = LOWER(:input) 
             OR LOWER(name) LIKE :fuzzyPattern 
             OR LOWER(slug) LIKE :fuzzyPattern
           ) 
           ORDER BY 
             CASE 
               WHEN slug = :slug THEN 1 
               WHEN slug = :slugified THEN 2 
               WHEN LOWER(name) = LOWER(:input) THEN 3 
               ELSE 4 
             END 
           LIMIT 1`,
          {
            replacements: {
              slug: storeInput,
              slugified,
              input: storeInput,
              fuzzyPattern,
            },
            type: QueryTypes.SELECT,
            transaction: t,
          }
        );
        if (foundStore) {
          targetStoreId = Number(foundStore.id);
          targetTenantId = Number(foundStore.tenant_id);
        }
      }

      targetTenantId = tenantId;
      if (!targetStoreId) {
        const [tenantStore]: any = await sequelize.query(
          'SELECT id FROM stores WHERE tenant_id = :tenantId AND status = "active" ORDER BY id DESC LIMIT 1',
          { replacements: { tenantId }, type: QueryTypes.SELECT, transaction: t }
        );
        if (tenantStore) {
          targetStoreId = Number(tenantStore.id);
        } else {
          const storeSlug = `default-store-${Date.now()}`;
          await sequelize.query(
            `INSERT INTO stores (tenant_id, name, slug, status, created_at, updated_at) 
             VALUES (:tId, 'Default Store', :slug, 'active', NOW(), NOW())`,
            { replacements: { tId: tenantId, slug: storeSlug }, type: QueryTypes.INSERT, transaction: t }
          );
          const [createdStore]: any = await sequelize.query(
            'SELECT id FROM stores WHERE slug = :slug LIMIT 1',
            { replacements: { slug: storeSlug }, type: QueryTypes.SELECT, transaction: t }
          );
          targetStoreId = createdStore ? Number(createdStore.id) : 1;
        }
      }

      const user = await User.create(
        {
          tenantId: targetTenantId,
          uuid: uuidv4(),
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          mobile: data.mobile || null,
          status: 'active',
        },
        { transaction: t }
      );

      await UserProfile.create(
        {
          tenantId: targetTenantId,
          userId: user.id,
        },
        { transaction: t }
      );

      // Create Customer Record safely
      try {
        const existingCustomer = await Customer.findOne({ where: { tenantId: targetTenantId, email: user.email }, transaction: t });
        if (!existingCustomer) {
          await Customer.create(
            {
              tenantId: targetTenantId,
              storeId: targetStoreId,
              uuid: uuidv4(),
              customerCode: `CUST-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              fullName: `${user.firstName} ${user.lastName}`,
              phone: data.mobile || `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              status: 'active',
            },
            { transaction: t }
          );
        }
      } catch (custErr) {
        this.logError('Optional Customer record creation notice:', custErr);
      }

      // Assign Customer Role
      const customerRole = await Role.findOne({ where: { name: 'CUSTOMER' }, transaction: t });
      if (customerRole) {
        await UserRole.create(
          {
            tenantId: targetTenantId,
            userId: user.id,
            roleId: customerRole.id,
          },
          { transaction: t }
        );
      }

      return user;
    });
  }

  /**
   * Logs in a user, manages locking, history, and registers device context
   */
  public async login(
    tenantId: number,
    data: any,
    clientContext: { ip: string; userAgent: string },
    context?: RequestContext
  ): Promise<{ accessToken: string; refreshToken: string; user: User; tenant: Tenant }> {
    const email = data.email.toLowerCase();
    this.logInfo(`Login attempt for ${email} on tenant ${tenantId}`, context);

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const user = await this.userRepository.findByEmail(tenantId, email);

    if (!user) {
      await LoginHistory.create({
        tenantId,
        userId: null,
        emailAttempted: email,
        wasSuccessful: false,
        failureReason: 'User not found',
        ipAddress: clientContext.ip,
        userAgent: clientContext.userAgent,
      });
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.status === 'disabled' || user.status === 'suspended') {
      await LoginHistory.create({
        tenantId,
        userId: user.id,
        emailAttempted: email,
        wasSuccessful: false,
        failureReason: 'Account is inactive, disabled or suspended',
        ipAddress: clientContext.ip,
        userAgent: clientContext.userAgent,
      });
      throw new AuthenticationError('Account is inactive, disabled or suspended');
    }

    // Lockout Checks
    if ((user.status as any) === 'locked') {
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        await LoginHistory.create({
          tenantId,
          userId: user.id,
          emailAttempted: email,
          wasSuccessful: false,
          failureReason: 'Account temporarily locked',
          ipAddress: clientContext.ip,
          userAgent: clientContext.userAgent,
        });
        throw new AuthenticationError('Account is temporarily locked. Try again later.');
      } else {
        // Lock expired
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.status = 'active';
        await user.save();
      }
    }

    // Verify Password
    const passwordMatch = await user.comparePassword(data.password);

    if (!passwordMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.status = 'locked';
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        this.logInfo(`User account locked due to consecutive failures: ${email}`, context);
      }
      await user.save();

      await LoginHistory.create({
        tenantId,
        userId: user.id,
        emailAttempted: email,
        wasSuccessful: false,
        failureReason: 'Incorrect password',
        ipAddress: clientContext.ip,
        userAgent: clientContext.userAgent,
      });

      throw new AuthenticationError('Invalid email or password');
    }

    // Success login operations
    const isFirstLogin = !user.lastLoginAt;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    if ((user.status as any) === 'locked') {
      user.status = 'active';
    }
    await user.save();

    if (isFirstLogin) {
      await createAuditLog(
        {
          action: 'user.first_login',
          entityType: 'user',
          entityId: String(user.id),
          newValues: { email: user.email },
        },
        context
      );
    }

    // Register Device Context
    const deviceUuid =
      data.deviceUuid || this.hashSHA256(clientContext.userAgent + clientContext.ip);
    await UserDevice.upsert({
      tenantId,
      userId: user.id,
      deviceUuid,
      deviceName: data.deviceName || 'Web Browser',
      platform: data.platform || null,
      browser: data.browser || null,
      operatingSystem: data.os || null,
      lastUserAgent: clientContext.userAgent,
      lastIpAddress: clientContext.ip,
      lastSeenAt: new Date(),
    });

    // Record Login History
    await LoginHistory.create({
      tenantId,
      userId: user.id,
      emailAttempted: email,
      wasSuccessful: true,
      failureReason: null,
      ipAddress: clientContext.ip,
      userAgent: clientContext.userAgent,
    });

    // Generate tokens
    const tokens = await this.issueTokenPair(tenantId, tenant.uuid, user, clientContext);

    return {
      ...tokens,
      user,
      tenant,
    };
  }

  /**
   * Refreshes access tokens, implements Refresh Token Rotation (RTR) and reuse detection
   */
  public async refresh(
    tenantId: number,
    refreshTokenString: string,
    clientContext: { ip: string; userAgent: string },
    context?: RequestContext
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AuthenticationError('Invalid refresh token signature');
    }

    const rawRefreshToken = decoded.jti;
    if (!rawRefreshToken) {
      throw new AuthenticationError('Invalid refresh token identifier');
    }

    const tokenHash = this.hashSHA256(rawRefreshToken);
    const tokenRecord = await this.refreshTokenRepository.findByHash(tenantId, tokenHash);

    if (!tokenRecord) {
      throw new AuthenticationError('Refresh token details unrecognized');
    }

    // Rotation Reuse Detection (Theft check)
    if (tokenRecord.revokedAt) {
      // Security breach warning: Revoke all tokens in family
      await this.refreshTokenRepository.revokeFamily(
        tenantId,
        tokenRecord.familyId,
        'Token reuse breach triggered'
      );
      this.logError(
        `Refresh token reuse breach detected! Family revoked: ${tokenRecord.familyId}`,
        null as any,
        context
      );
      throw new AuthenticationError('Session invalidated due to suspicious activity');
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      throw new AuthenticationError('Refresh token expired');
    }

    const user = await User.findByPk(tokenRecord.userId);
    const tenant = await Tenant.findByPk(tenantId);
    if (!user || !tenant) {
      throw new AuthenticationError('Identity could not be confirmed');
    }

    // Secure rotation: Consumed/Revoked rotated token
    tokenRecord.revokedAt = new Date();
    tokenRecord.revokeReason = 'Rotated';
    await tokenRecord.save();

    // Issue new pair under the same family
    return this.issueTokenPair(
      tenantId,
      tenant.uuid,
      user,
      clientContext,
      tokenRecord.familyId,
      tokenRecord.id
    );
  }

  public async logout(
    tenantId: number,
    refreshTokenString: string,
    context?: RequestContext
  ): Promise<void> {
    this.logInfo('Logout request received', context);
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AuthenticationError('Invalid refresh token signature');
    }

    const rawRefreshToken = decoded.jti;
    if (!rawRefreshToken) {
      throw new AuthenticationError('Invalid refresh token identifier');
    }

    const tokenHash = this.hashSHA256(rawRefreshToken);
    const tokenRecord = await this.refreshTokenRepository.findByHash(tenantId, tokenHash);

    if (tokenRecord) {
      tokenRecord.revokedAt = new Date();
      tokenRecord.revokeReason = 'User logged out';
      await tokenRecord.save();
    }
  }

  /**
   * Revokes all refresh token sessions in the lineage family
   */
  public async logoutAll(
    tenantId: number,
    refreshTokenString: string,
    context?: RequestContext
  ): Promise<void> {
    this.logInfo('Logout-all request received', context);
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AuthenticationError('Invalid refresh token signature');
    }

    const rawRefreshToken = decoded.jti;
    if (!rawRefreshToken) {
      throw new AuthenticationError('Invalid refresh token identifier');
    }

    const tokenHash = this.hashSHA256(rawRefreshToken);
    const tokenRecord = await this.refreshTokenRepository.findByHash(tenantId, tokenHash);

    if (tokenRecord) {
      await this.refreshTokenRepository.revokeFamily(
        tenantId,
        tokenRecord.familyId,
        'Logged out all devices'
      );
    }
  }

  /**
   * Requests a password reset token
   */
  public async requestPasswordReset(
    tenantId: number | null,
    email: string,
    clientContext: { ip: string; userAgent: string },
    _context?: RequestContext
  ): Promise<string> {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    let user = await User.findOne({ where: { email: normalizedEmail, status: 'active' } });
    if (!user) {
      user = await this.userRepository.findByEmail(tenantId || 1, normalizedEmail);
    }
    if (!user) {
      // Prevent user enumeration: act successful
      return 'generic-success';
    }

    // Invalidate any previous unused password reset tokens for this user
    try {
      await PasswordResetToken.update(
        { consumedAt: new Date() },
        { where: { userId: user.id, consumedAt: null } }
      );
    } catch {
      // Invalidation cleanup
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashSHA256(rawToken);

    // 15 Minutes Expiration Requirement
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.create({
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash,
      expiresAt,
      requestedIp: clientContext.ip,
      userAgent: clientContext.userAgent,
    });

    try {
      const userRole = (user as any).role || (user as any).userType || 'CUSTOMER';
      const isCustomer = userRole === 'CUSTOMER';
      const defaultPort = isCustomer ? '3000' : '5173';
      const localNetworkIp = getLocalNetworkIp();

      const localhostUrl = isCustomer ? `http://localhost:3000/reset-password?token=${rawToken}` : `http://localhost:5173/reset-password?token=${rawToken}`;
      const networkUrl = localNetworkIp ? `http://${localNetworkIp}:${defaultPort}/reset-password?token=${rawToken}` : '';
      const primaryUrl = process.env.CUSTOMER_PORTAL_URL ? `${process.env.CUSTOMER_PORTAL_URL}/reset-password?token=${rawToken}` : localhostUrl;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; text-decoration: none; margin-bottom: 24px; display: inline-block; }
            .heading { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
            .body-text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
            .btn-mobile { display: inline-block; background-color: #16a34a; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
            .warning { font-size: 13px; color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 6px; border: 1px solid #fecaca; margin-top: 20px; }
            .mobile-box { font-size: 13px; color: #1e40af; background: #eff6ff; padding: 16px; border-radius: 8px; border: 1px solid #bfdbfe; margin-top: 16px; text-align: center; }
            .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Comzilo Platform</div>
            <div class="heading">Password Reset Request</div>
            <div class="body-text">
              Hello <strong>${user.firstName || 'Valued User'}</strong>,<br/><br/>
              We received a request to reset the password for your Comzilo account (<strong>${user.email}</strong>).
            </div>
            
            <div style="text-align: center; margin: 16px 0;">
              <a href="${primaryUrl}" class="btn" target="_blank">Reset Password (Computer / PC)</a>
            </div>

            ${networkUrl ? `
            <div class="mobile-box">
              <strong style="font-size: 14px;">📱 Opening on Mobile Phone / Tablet?</strong><br/>
              <span style="font-size: 13px; color: #475569;">If opening from a phone connected to local Wi-Fi, tap the button below:</span><br/>
              <a href="${networkUrl}" class="btn-mobile" target="_blank">Reset Password (Mobile Phone)</a>
            </div>
            ` : ''}

            <div class="warning">
              ⏳ <strong>Expiration Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> only and can be used only once.
            </div>
            <div class="body-text" style="margin-top: 24px;">
              If you did not request a password reset, please ignore this email or contact support.
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Comzilo Multi-Tenant SaaS Platform. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;

      const smtpService = new SmtpService();
      await smtpService.sendEmail({
        tenantId: user.tenantId || 1,
        to: user.email,
        subject: '🔒 Reset Your Comzilo Account Password',
        html: emailHtml,
        templateName: 'password_reset',
      });
    } catch (e: any) {
      this.logError('Failed to send password reset email via SMTP', e);
    }

    return rawToken;
  }

  /**
   * Validate password reset token
   */
  public async validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    if (!token || typeof token !== 'string') {
      return { valid: false, message: 'This password reset link is invalid or has expired.' };
    }

    const tokenHash = this.hashSHA256(token);
    const tokenRecord = await PasswordResetToken.findOne({ where: { tokenHash } });

    if (!tokenRecord || tokenRecord.consumedAt || new Date(tokenRecord.expiresAt) < new Date()) {
      return { valid: false, message: 'This password reset link is invalid or has expired.' };
    }

    return { valid: true };
  }

  /**
   * Resets password using valid token
   */
  public async resetPassword(
    tenantId: number,
    data: any,
    context?: RequestContext
  ): Promise<void> {
    const rawToken = data.token;
    if (!rawToken) {
      throw new ValidationError('Reset token is required');
    }

    const newPass = data.password || data.newPassword;
    const confirmPass = data.confirmPassword;

    if (!newPass) {
      throw new ValidationError('New password is required');
    }

    if (confirmPass && newPass !== confirmPass) {
      throw new ValidationError('New Password and Confirm Password must match.');
    }

    if (!validatePasswordPolicy(newPass)) {
      throw new ValidationError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
    }

    const tokenHash = this.hashSHA256(rawToken);
    let tokenRecord = await PasswordResetToken.findOne({ where: { tokenHash } });
    if (!tokenRecord) {
      tokenRecord = await this.resetTokenRepository.findActiveToken(tenantId || 1, tokenHash);
    }

    if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date() || tokenRecord.consumedAt) {
      throw new ValidationError('This password reset link is invalid or has expired.');
    }

    const user = await User.findByPk(tokenRecord.userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    const passwordHash = await bcrypt.hash(newPass, env.BCRYPT_ROUNDS);

    await withTransaction(async (t) => {
      user.passwordHash = passwordHash;
      user.failedLoginAttempts = 0;
      user.mustChangePassword = false;
      user.status = 'active';
      await user.save({ transaction: t });

      tokenRecord!.consumedAt = new Date();
      await tokenRecord!.save({ transaction: t });
    });

    // Revoke any active login sessions for user
    try {
      await RefreshToken.update(
        { revokedAt: new Date(), revokeReason: 'Password reset' },
        { where: { userId: user.id, revokedAt: null } }
      );
    } catch {
      // Invalidate sessions
    }

    await createAuditLog(
      {
        action: 'password.reset',
        entityType: 'User',
        entityId: String(user.id),
      },
      context
    );
  }

  /**
   * Allows authenticated user to change password
   */
  public async changePassword(
    _tenantId: number,
    userId: number,
    data: any,
    context?: RequestContext
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await user.comparePassword(data.currentPassword);
    if (!isMatch) {
      throw new ValidationError('Current password is incorrect');
    }

    if (!validatePasswordPolicy(data.newPassword)) {
      throw new ValidationError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);
    user.mustChangePassword = false;
    await user.save();

    await createAuditLog(
      {
        action: 'password.changed',
        entityType: 'user',
        entityId: String(user.id),
      },
      context
    );
  }

  /**
   * Requests email verification OTP
   */
  public async requestEmailVerification(
    tenantId: number,
    userId: number,
    _context?: RequestContext
  ): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000)); // 6 digit OTP
    const otpHash = await bcrypt.hash(otpCode, 8); // fast rounds for OTP

    await OtpRequest.create({
      tenantId,
      userId,
      purpose: 'email_verification',
      destination: user.email,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins expiry
    });

    return otpCode;
  }

  /**
   * Verifies email using verification OTP code
   */
  public async verifyEmail(
    tenantId: number,
    userId: number,
    otpCode: string,
    _context?: RequestContext
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    const otpRecord = await this.otpRequestRepository.findLatestActive(
      tenantId,
      user.email,
      'email_verification'
    );

    if (!otpRecord || new Date(otpRecord.expiresAt) < new Date()) {
      throw new ValidationError('Invalid or expired verification OTP');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new ValidationError('Maximum OTP verification attempts exceeded');
    }

    const isMatch = await otpRecord.compareOtp(otpCode);

    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new ValidationError('Incorrect verification OTP code');
    }

    await withTransaction(async (t) => {
      user.emailVerifiedAt = new Date();
      await user.save({ transaction: t });

      otpRecord.consumedAt = new Date();
      await otpRecord.save({ transaction: t });
    });
  }

  /**
   * Helper to issue an access and refresh token pair
   */
  private async issueTokenPair(
    tenantId: number,
    _tenantUuid: string,
    user: User,
    clientContext: { ip: string; userAgent: string },
    familyId?: string,
    rotatedFrom?: number
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const userPayload = {
      userId: user.id,
      tenantId,
      jti: uuidv4(),
      tokenType: 'access',
    };

    const accessToken = jwt.sign(userPayload, env.JWT_ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });

    const activeFamilyId = familyId || uuidv4();
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashSHA256(rawRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      tenantId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      familyId: activeFamilyId,
      rotatedFrom: rotatedFrom || null,
      expiresAt,
      ipAddress: clientContext.ip,
      userAgent: clientContext.userAgent,
    });

    const refreshTokenPayload = {
      userId: user.id,
      tenantId,
      familyId: activeFamilyId,
    };

    // Sign the raw secret into the client JWT refresh token
    const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_REFRESH_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
      jwtid: rawRefreshToken, // include raw random signature for verification
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
