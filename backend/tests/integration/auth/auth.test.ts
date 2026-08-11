import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import app from '../../../src/app';
import { sequelize, connectDatabase, disconnectDatabase } from '../../../src/config/database';
import { env } from '../../../src/config/env';
import { resetDatabase } from '../../../src/database/helpers/reset';
import { execSync } from 'child_process';
import {
  User,
  RefreshToken,
  UserDevice,
  OtpRequest,
  PasswordResetToken,
} from '../../../src/database/models';

describe('Authentication & Identity Integration Tests', () => {
  let tenantUuid: string;

  beforeAll(async () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.TEST_DB_NAME).toContain('test');

    // Programmatically reset, migrate and seed database
    await resetDatabase();
    execSync('npm run db:test:migrate', { stdio: 'ignore' });
    execSync('npm run db:test:seed', { stdio: 'ignore' });

    await connectDatabase();

    // Create a mock tenant for testing
    const uuid = uuidv4();
    const slug = `t-${uuidv4().substring(0, 8)}`;
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Auth Test Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid, slug } }
    );

    // Retrieve registered tenant details
    const [tenants]: any = await sequelize.query(`SELECT uuid FROM tenants WHERE uuid = :uuid`, {
      replacements: { uuid },
    });
    tenantUuid = tenants[0].uuid;
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  // 1. User Registration Tests
  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer user and profile successfully', async () => {
      const email = `user-${uuidv4()}@example.com`;
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email,
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(email);
      expect(response.body.data.uuid).toBeDefined();

      const user = await User.findOne({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.firstName).toBe('John');
    });

    it('should reject registration if email already exists on the same tenant', async () => {
      const email = `user-${uuidv4()}@example.com`;
      // Create first user
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email,
        password: 'Password123!',
        firstName: 'First',
        lastName: 'User',
      });

      // Try registering duplicate email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email,
          password: 'Password123!',
          firstName: 'Second',
          lastName: 'User',
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DUPLICATE_EMAIL');
    });
  });

  // 2. User Login & Lockout Tests
  describe('POST /api/v1/auth/login', () => {
    const loginEmail = `login-${uuidv4()}@example.com`;
    const password = 'Password123!';

    beforeAll(async () => {
      // Register login test user
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: loginEmail,
        password,
        firstName: 'Login',
        lastName: 'Tester',
      });
    });

    it('should authenticate user and issue token pairs', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: loginEmail,
          password,
          deviceName: 'Test Phone',
          platform: 'iOS',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(loginEmail);

      // Verify device registration
      const device = await UserDevice.findOne({ where: { deviceName: 'Test Phone' } });
      expect(device).toBeDefined();
      expect(device?.platform).toBe('iOS');
    });

    it('should track failed attempts and lock account after 5 consecutive failures', async () => {
      // 4 consecutive bad logins
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('X-Tenant-UUID', tenantUuid)
          .send({
            email: loginEmail,
            password: 'BadPassword',
          });
        expect(res.status).toBe(401);
      }

      // Check failed attempts is 4
      let user = await User.findOne({ where: { email: loginEmail } });
      expect(user?.failedLoginAttempts).toBe(4);
      expect(user?.status).toBe('active');

      // 5th bad login -> Lockout
      const lockoutRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: loginEmail,
          password: 'BadPassword',
        });

      expect(lockoutRes.status).toBe(401);

      user = await User.findOne({ where: { email: loginEmail } });
      expect(user?.failedLoginAttempts).toBe(5);
      expect(user?.status).toBe('locked');
      expect(user?.lockedUntil).toBeDefined();

      // Subsequent attempt blocked even with correct password
      const blockRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: loginEmail,
          password,
        });

      expect(blockRes.status).toBe(401);
      expect(blockRes.body.message).toContain('locked');

      // Manual unlock for next test suites
      user!.status = 'active';
      user!.failedLoginAttempts = 0;
      user!.lockedUntil = null;
      await user!.save();
    });
  });

  // 3. Refresh Token Rotation (RTR) and reuse lineage tests
  describe('POST /api/v1/auth/refresh', () => {
    const refreshEmail = `refresh-${uuidv4()}@example.com`;
    const password = 'Password123!';
    let refreshToken: string;

    beforeAll(async () => {
      // Register & Login to get token pair
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: refreshEmail,
        password,
        firstName: 'Refresh',
        lastName: 'Tester',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: refreshEmail,
          password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should rotate access and refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify that old refresh token has been marked rotated
      const oldPayload = JSON.parse(
        Buffer.from(refreshToken.split('.')[1], 'base64').toString('utf-8')
      );
      const oldHash = crypto.createHash('sha256').update(oldPayload.jti).digest('hex');
      const tokenRecord = await RefreshToken.findOne({ where: { tokenHash: oldHash } });
      expect(tokenRecord?.revokedAt).toBeDefined();
      expect(tokenRecord?.revokeReason).toBe('Rotated');

      // Update token variables for subsequent reuse test
      refreshToken = response.body.data.refreshToken;
    });

    it('should revoke all tokens in the lineage family on reuse detection', async () => {
      // Perform valid refresh to consume our current refreshToken
      const rotateResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ refreshToken });

      expect(rotateResponse.status).toBe(200);

      // Attempt reuse of the previously rotated token
      const reuseResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ refreshToken });

      expect(reuseResponse.status).toBe(401);

      // Verify that the new refresh token issued in rotateResponse is also revoked!
      const currentPayload = JSON.parse(
        Buffer.from(rotateResponse.body.data.refreshToken.split('.')[1], 'base64').toString('utf-8')
      );
      const currentHash = crypto.createHash('sha256').update(currentPayload.jti).digest('hex');
      const currentToken = await RefreshToken.findOne({ where: { tokenHash: currentHash } });
      expect(currentToken?.revokedAt).toBeDefined();
      expect(currentToken?.revokeReason).toContain('reuse');
    });
  });

  // 4. Password Reset & Forgot password tests
  describe('POST /api/v1/auth/request-password-reset & reset-password', () => {
    const resetEmail = `reset-${uuidv4()}@example.com`;
    const password = 'Password123!';
    let resetToken: string;

    beforeAll(async () => {
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: resetEmail,
        password,
        firstName: 'Reset',
        lastName: 'Tester',
      });
    });

    it('should generate password reset token and reset user password', async () => {
      // 1. Request Password Reset (returns token only in test NODE_ENV)
      const reqResponse = await request(app)
        .post('/api/v1/auth/request-password-reset')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ email: resetEmail });

      expect(reqResponse.status).toBe(200);
      resetToken = reqResponse.body.data.token;
      expect(resetToken).toBeDefined();

      // 2. Perform reset password
      const resetResponse = await request(app)
        .post('/api/v1/auth/reset-password')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        });

      expect(resetResponse.status).toBe(200);

      // Verify reset token consumed
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const tokenRecord = await PasswordResetToken.findOne({ where: { tokenHash } });
      expect(tokenRecord?.consumedAt).toBeDefined();

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: resetEmail,
          password: 'NewPassword123!',
        });
      expect(loginRes.status).toBe(200);
    });
  });

  // 5. OTP Email Verification Tests
  describe('POST /api/v1/auth/request-email-verification & verify-email', () => {
    const verifyEmailAddr = `verify-${uuidv4()}@example.com`;
    let accessToken: string;
    let otpCode: string;

    beforeAll(async () => {
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: verifyEmailAddr,
        password: 'Password123!',
        firstName: 'Verify',
        lastName: 'Tester',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: verifyEmailAddr,
          password: 'Password123!',
        });
      accessToken = loginRes.body?.data?.accessToken || '';
    });

    it('should generate verification OTP, verify it, and mark email as verified', async () => {
      // 1. Request OTP (returns otpCode only in test NODE_ENV)
      const otpResponse = await request(app)
        .post('/api/v1/auth/request-email-verification')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(otpResponse.status).toBe(200);
      otpCode = otpResponse.body.data.otpCode;
      expect(otpCode).toBeDefined();

      // 2. Verify with incorrect OTP first
      const badVerifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ otpCode: '000000' });

      expect(badVerifyRes.status).toBe(400);

      // 3. Verify with correct OTP
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ otpCode });

      expect(verifyRes.status).toBe(200);

      // Verify email_verified_at set on User
      const user = await User.findOne({ where: { email: verifyEmailAddr } });
      expect(user?.emailVerifiedAt).toBeDefined();
    });
  });

  // 6. Access Profile /api/v1/auth/me tests
  describe('GET /api/v1/auth/me', () => {
    const profileEmail = `me-${uuidv4()}@example.com`;
    let accessToken: string;

    beforeAll(async () => {
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: profileEmail,
        password: 'Password123!',
        firstName: 'Me',
        lastName: 'Tester',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          email: profileEmail,
          password: 'Password123!',
        });
      accessToken = loginRes.body?.data?.accessToken || '';
    });

    it('should return profile and tenant scope for authenticated session', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(profileEmail);
      expect(response.body.data.firstName).toBe('Me');
      expect(response.body.data.profile).toBeDefined();
    });

    it('should reject call if JWT Bearer token is missing', async () => {
      const response = await request(app).get('/api/v1/auth/me').set('X-Tenant-UUID', tenantUuid);

      expect(response.status).toBe(401);
    });
  });

  // 7. Security Hardening & Edge Cases
  describe('Authentication Security Hardening & Edge Cases', () => {
    const edgeEmail = `edge-${uuidv4()}@example.com`;
    const password = 'Password123!';
    let edgeUserId: number;
    let edgeAccessToken: string;

    beforeAll(async () => {
      // Register edge user
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: edgeEmail,
        password,
        firstName: 'Edge',
        lastName: 'Tester',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ email: edgeEmail, password });

      edgeAccessToken = loginRes.body?.data?.accessToken || '';

      const userRecord: any = await User.findOne({ where: { email: edgeEmail } });
      edgeUserId = userRecord.id;
    });

    it('should reject expired JWT access tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: edgeUserId, tenantId: 1, jti: uuidv4(), tokenType: 'access' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '-5s' }
      );

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject tampered JWT access tokens', async () => {
      const validToken = jwt.sign(
        { userId: edgeUserId, tenantId: 1, jti: uuidv4(), tokenType: 'access' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '10m' }
      );
      const tamperedToken = validToken + 'a';

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject expired refresh tokens', async () => {
      const rawToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const familyId = uuidv4();

      await RefreshToken.create({
        tenantId: 1,
        userId: edgeUserId,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() - 1000), // Expired
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const expiredJwt = jwt.sign(
        { userId: edgeUserId, tenantId: 1, familyId },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '-5s', jwtid: rawToken }
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ refreshToken: expiredJwt });

      expect(response.status).toBe(401);
    });

    it('should reject already revoked refresh tokens', async () => {
      const rawToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const familyId = uuidv4();

      await RefreshToken.create({
        tenantId: 1,
        userId: edgeUserId,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: new Date(),
        revokeReason: 'Test Revocation',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const revokedJwt = jwt.sign(
        { userId: edgeUserId, tenantId: 1, familyId },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '1h', jwtid: rawToken }
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ refreshToken: revokedJwt });

      expect(response.status).toBe(401);
    });

    it('should reject expired email verification OTP codes', async () => {
      const otpCode = '999999';
      const otpHash = await bcrypt.hash(otpCode, 4);

      await OtpRequest.create({
        tenantId: 1,
        userId: edgeUserId,
        purpose: 'email_verification',
        destination: edgeEmail,
        otpHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .set('X-Tenant-UUID', tenantUuid)
        .set('Authorization', `Bearer ${edgeAccessToken}`)
        .send({ otpCode });

      expect(response.status).toBe(400); // Expect validation failure / verification failure
    });

    it('should reject expired password reset tokens', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await PasswordResetToken.create({
        tenantId: 1,
        userId: edgeUserId,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ token: rawToken, password: 'NewPassword123!' });

      expect(response.status).toBe(400); // Expect bad request/validation failure
    });

    it('should reject logins for inactive, disabled or suspended accounts', async () => {
      const disabledEmail = `disabled-${uuidv4()}@example.com`;
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: disabledEmail,
        password,
        firstName: 'Disabled',
        lastName: 'User',
      });

      const userRecord: any = await User.findOne({ where: { email: disabledEmail } });
      userRecord.status = 'disabled';
      await userRecord.save();

      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ email: disabledEmail, password });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('inactive');
    });

    it('should revoke entire lineage family on logout-all', async () => {
      const logoutAllEmail = `logoutall-${uuidv4()}@example.com`;
      await request(app).post('/api/v1/auth/register').set('X-Tenant-UUID', tenantUuid).send({
        email: logoutAllEmail,
        password,
        firstName: 'Logout',
        lastName: 'All',
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ email: logoutAllEmail, password });

      const { refreshToken } = loginRes.body.data;
      const decoded = JSON.parse(
        Buffer.from(refreshToken.split('.')[1], 'base64').toString('utf-8')
      );

      const response = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('X-Tenant-UUID', tenantUuid)
        .send({ refreshToken });

      expect(response.status).toBe(200);

      const tokenRecord = await RefreshToken.findOne({
        where: { tokenHash: crypto.createHash('sha256').update(decoded.jti).digest('hex') },
      });
      expect(tokenRecord?.revokedAt).toBeDefined();
      expect(tokenRecord?.revokeReason).toContain('all');
    });
  });
});
