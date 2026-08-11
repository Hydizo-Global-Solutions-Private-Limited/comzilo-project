/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { sequelize, connectDatabase, disconnectDatabase } from '../../src/config/database';
import { env } from '../../src/config/env';
import { resetDatabase } from '../../src/database/helpers/reset';
import { execSync } from 'child_process';
import { Tenant, Store, StoreSettings, Subscription } from '../../src/database/models';

describe('Tenant & Store Management Integration Tests', () => {
  let tenantAId: number;
  let tenantAUuid: string;
  let tenantBId: number;
  let tenantBUuid: string;

  let superAdminToken: string;
  let tenantAAdminToken: string;
  let tenantBAdminToken: string;
  let noPermissionUserToken: string;

  beforeAll(async () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.TEST_DB_NAME).toContain('test');

    // Programmatically reset, migrate and seed database
    await resetDatabase();
    execSync('npm run db:test:migrate', { stdio: 'ignore' });
    execSync('npm run db:test:seed', { stdio: 'ignore' });

    await connectDatabase();

    // Create Tenant A
    const tenantAUuidRaw = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Tenant A', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantAUuidRaw, slug: `slug-${tenantAUuidRaw}` } }
    );
    const [tARes]: any = await sequelize.query(`SELECT id, uuid FROM tenants WHERE uuid = :uuid`, {
      replacements: { uuid: tenantAUuidRaw },
    });
    tenantAId = tARes[0].id;
    tenantAUuid = tARes[0].uuid;

    // Create Tenant B
    const tenantBUuidRaw = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Tenant B', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantBUuidRaw, slug: `slug-${tenantBUuidRaw}` } }
    );
    const [tBRes]: any = await sequelize.query(`SELECT id, uuid FROM tenants WHERE uuid = :uuid`, {
      replacements: { uuid: tenantBUuidRaw },
    });
    tenantBId = tBRes[0].id;
    tenantBUuid = tBRes[0].uuid;

    // Create users in Tenant A & B
    const createTestUser = async (tenantId: number, email: string) => {
      const userUuid = uuidv4();
      await sequelize.query(
        `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
         VALUES (:tenantId, :uuid, :email, 'hashed', 'Test', 'User', 'active', 0, NOW(), NOW())`,
        { replacements: { tenantId, uuid: userUuid, email } }
      );
      const [uRes]: any = await sequelize.query(
        `SELECT id, uuid, email FROM users WHERE uuid = :uuid`,
        {
          replacements: { uuid: userUuid },
        }
      );
      return uRes[0];
    };

    const superAdminUser = await createTestUser(tenantAId, `super-${uuidv4()}@example.com`);
    const tenantAUser = await createTestUser(tenantAId, `admina-${uuidv4()}@example.com`);
    const tenantBUser = await createTestUser(tenantBId, `adminb-${uuidv4()}@example.com`);
    const guestUser = await createTestUser(tenantAId, `guest-${uuidv4()}@example.com`);

    // Seed custom permissions required for Step 9
    const customPermissions = [
      { code: 'tenant.read', name: 'Read Tenant', module: 'tenant' },
      { code: 'tenant.create', name: 'Create Tenant', module: 'tenant' },
      { code: 'tenant.update', name: 'Update Tenant', module: 'tenant' },
      { code: 'tenant.delete', name: 'Delete Tenant', module: 'tenant' },
      { code: 'store.read', name: 'Read Store', module: 'store' },
      { code: 'store.create', name: 'Create Store', module: 'store' },
      { code: 'store.update', name: 'Update Store', module: 'store' },
      { code: 'store.delete', name: 'Delete Store', module: 'store' },
    ];

    for (const cp of customPermissions) {
      await sequelize.query(
        `INSERT IGNORE INTO permissions (code, name, module, description, created_at, updated_at)
         VALUES (:code, :name, :module, 'custom description', NOW(), NOW())`,
        { replacements: cp }
      );
    }

    // Assign Roles
    // superAdmin -> system-wide super_admin (tenant_id = null or specific, let's make it super_admin)
    const [dbRoles]: any = await sequelize.query(`SELECT id, code FROM roles`);
    const roleMap = new Map<string, number>();
    for (const r of dbRoles) {
      roleMap.set(r.code, r.id);
    }

    const [allPerms]: any = await sequelize.query(`SELECT id, code FROM permissions`);
    const permMap = new Map<string, number>();
    for (const p of allPerms) {
      permMap.set(p.code, p.id);
    }

    const targetRoles = [1, 2];
    for (const rId of targetRoles) {
      for (const cp of customPermissions) {
        const pId = permMap.get(cp.code)!;
        await sequelize.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
           VALUES (:rId, :pId, NOW())`,
          { replacements: { rId, pId } }
        );
      }
    }

    const saRoleId = roleMap.get('super_admin')!;
    const ownerRoleId = roleMap.get('tenant_owner')!;
    const staffRoleId = roleMap.get('staff')!;

    // Assign super_admin system-wide (store_id = null)
    await sequelize.query(
      `INSERT INTO user_roles (tenant_id, user_id, role_id, store_id, assigned_at, created_at, updated_at)
       VALUES (:tenantId, :userId, :roleId, NULL, NOW(), NOW(), NOW())`,
      { replacements: { tenantId: tenantAId, userId: superAdminUser.id, roleId: saRoleId } }
    );

    // Assign tenant_owner to Tenant A user
    await sequelize.query(
      `INSERT INTO user_roles (tenant_id, user_id, role_id, store_id, assigned_at, created_at, updated_at)
       VALUES (:tenantId, :userId, :roleId, NULL, NOW(), NOW(), NOW())`,
      { replacements: { tenantId: tenantAId, userId: tenantAUser.id, roleId: ownerRoleId } }
    );

    // Assign tenant_owner to Tenant B user
    await sequelize.query(
      `INSERT INTO user_roles (tenant_id, user_id, role_id, store_id, assigned_at, created_at, updated_at)
       VALUES (:tenantId, :userId, :roleId, NULL, NOW(), NOW(), NOW())`,
      { replacements: { tenantId: tenantBId, userId: tenantBUser.id, roleId: ownerRoleId } }
    );

    // Assign staff (guest user has no roles or staff role)
    await sequelize.query(
      `INSERT INTO user_roles (tenant_id, user_id, role_id, store_id, assigned_at, created_at, updated_at)
       VALUES (:tenantId, :userId, :roleId, NULL, NOW(), NOW(), NOW())`,
      { replacements: { tenantId: tenantAId, userId: guestUser.id, roleId: staffRoleId } }
    );

    // Generate Tokens
    const signToken = (user: any, tId: number, tUuid: string) => {
      return jwt.sign(
        {
          userId: user.id,
          userUuid: user.uuid,
          tenantId: tId,
          tenantUuid: tUuid,
          email: user.email,
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
    };

    superAdminToken = signToken(superAdminUser, tenantAId, tenantAUuid);
    tenantAAdminToken = signToken(tenantAUser, tenantAId, tenantAUuid);
    tenantBAdminToken = signToken(tenantBUser, tenantBId, tenantBUuid);
    noPermissionUserToken = signToken(guestUser, tenantAId, tenantAUuid);
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Tenant Management CRUD & Actions', () => {
    let createdTenantUuid: string;
    let createdTenantId: number;

    it('should create a new tenant with initial subscription as Super Admin', async () => {
      const response = await request(app)
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          name: 'Comzilo Shop Premium',
          slug: 'comzilo-shop-premium',
          planCode: 'starter',
          billingCycle: 'monthly',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Comzilo Shop Premium');
      expect(response.body.data.uuid).toBeDefined();

      createdTenantUuid = response.body.data.uuid;
      createdTenantId = response.body.data.id;

      // Verify subscription was created
      const sub = await Subscription.findOne({ where: { tenant_id: createdTenantId } });
      expect(sub).toBeDefined();
      expect(sub?.billingCycle).toBe('monthly');
    });

    it('should list all tenants for Super Admin', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3); // A, B, and Premium
    });

    it('should fetch a single tenant by UUID', async () => {
      const response = await request(app)
        .get(`/api/v1/tenants/${createdTenantUuid}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Comzilo Shop Premium');
    });

    it('should update tenant details', async () => {
      const response = await request(app)
        .put(`/api/v1/tenants/${createdTenantUuid}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          name: 'Comzilo Shop Enterprise',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Comzilo Shop Enterprise');
    });

    it('should assign/upgrade subscription plan', async () => {
      const response = await request(app)
        .post(`/api/v1/tenants/${createdTenantId}/subscription`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          planCode: 'pro',
          billingCycle: 'yearly',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.billingCycle).toBe('yearly');

      // Verify old subscriptions are marked expired
      const expiredSubs = await Subscription.findAll({
        where: { tenant_id: createdTenantId, status: 'expired' },
      });
      expect(expiredSubs.length).toBeGreaterThanOrEqual(1);
    });

    it('should get tenant statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/tenants/${createdTenantId}/statistics`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.storeCount).toBeDefined();
      expect(response.body.data.userCount).toBeDefined();
      expect(response.body.data.subscriptionPlan).toBeDefined();
    });

    it('should delete a tenant (soft-delete)', async () => {
      const response = await request(app)
        .delete(`/api/v1/tenants/${createdTenantUuid}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const tenant = await Tenant.findOne({ where: { uuid: createdTenantUuid } });
      expect(tenant).toBeNull();
    });

    it('should restore a soft-deleted tenant', async () => {
      const response = await request(app)
        .post(`/api/v1/tenants/${createdTenantUuid}/restore`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const tenant = await Tenant.findOne({ where: { uuid: createdTenantUuid } });
      expect(tenant).not.toBeNull();
    });
  });

  describe('Store Management CRUD & Actions', () => {
    let createdStoreId: number;

    it('should create a store for Tenant A', async () => {
      const response = await request(app)
        .post('/api/v1/stores')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          name: 'First Store Tenant A',
          slug: 'first-store-tenant-a',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          language: 'en',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('First Store Tenant A');

      createdStoreId = response.body.data.id;
    });

    it('should prevent creating duplicate store slug for the same tenant', async () => {
      const response = await request(app)
        .post('/api/v1/stores')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          name: 'First Store Tenant A Duplicate',
          slug: 'first-store-tenant-a',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should list stores under Tenant A', async () => {
      const response = await request(app)
        .get('/api/v1/stores')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(createdStoreId);
    });

    it('should retrieve a single store details', async () => {
      const response = await request(app)
        .get(`/api/v1/stores/${createdStoreId}`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('First Store Tenant A');
    });

    it('should update store settings (key-value)', async () => {
      const response = await request(app)
        .put(`/api/v1/stores/${createdStoreId}/settings`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          theme: { value: { primaryColor: '#ff0000', darkMode: true }, isPublic: true },
          invoicePrefix: { value: 'INV-A-', isPublic: false },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify settings written to db
      const settings = await StoreSettings.findAll({ where: { store_id: createdStoreId } });
      expect(settings.length).toBe(2);
    });

    it('should fetch store settings', async () => {
      const response = await request(app)
        .get(`/api/v1/stores/${createdStoreId}/settings`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoicePrefix).toBe('INV-A-');
    });

    it('should register custom domain', async () => {
      const response = await request(app)
        .post(`/api/v1/stores/${createdStoreId}/domain`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          domain: 'shop.tenant-a.com',
          domainType: 'custom',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationStatus).toBe('pending');
    });

    it('should verify custom domain', async () => {
      const response = await request(app)
        .post(`/api/v1/stores/${createdStoreId}/domain/verify`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          domain: 'shop.tenant-a.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationStatus).toBe('verified');
    });

    it('should set domain as primary', async () => {
      const response = await request(app)
        .post(`/api/v1/stores/${createdStoreId}/domain/primary`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          domain: 'shop.tenant-a.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isPrimary).toBe(true);
    });

    it('should delete domain', async () => {
      const response = await request(app)
        .delete(`/api/v1/stores/${createdStoreId}/domain`)
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          domain: 'shop.tenant-a.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Isolation & Security Boundaries', () => {
    let storeAId: number;

    beforeAll(async () => {
      const store = await Store.findOne({ where: { tenant_id: tenantAId } });
      storeAId = store!.id;
    });

    it('should prevent Tenant B admin from viewing Tenant A store due to tenant mismatch', async () => {
      const response = await request(app)
        .get(`/api/v1/stores/${storeAId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .set('X-Tenant-UUID', tenantAUuid); // Request claims Tenant A scope, but token is Tenant B

      expect([403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should prevent a user without required permissions from executing store actions', async () => {
      const response = await request(app)
        .post('/api/v1/stores')
        .set('Authorization', `Bearer ${noPermissionUserToken}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .send({
          name: 'Unauthorized Store',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required permission');
    });
  });
});
