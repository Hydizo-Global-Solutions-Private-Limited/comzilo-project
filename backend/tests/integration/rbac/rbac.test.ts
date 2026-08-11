/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import app from '../../../src/app';
import { sequelize, connectDatabase, disconnectDatabase } from '../../../src/config/database';
import { env } from '../../../src/config/env';
import { resetDatabase } from '../../../src/database/helpers/reset';
import { execSync } from 'child_process';
import { UserRole } from '../../../src/database/models';
import { tenantResolver } from '../../../src/middleware/tenantResolver';
import { authenticate } from '../../../src/middleware/auth.middleware';
import {
  authorize,
  requirePermission,
  requireRole,
  requireAnyPermission,
  requireAllPermissions,
} from '../../../src/middleware/authz.middleware';

import express from 'express';

const testRouter = express.Router();
// Mount dynamic test endpoints on the testRouter for integration verification
testRouter.get(
  '/api/test/rbac/permission-tenant-view',
  tenantResolver,
  authenticate,
  authorize,
  requirePermission('tenant.view'),
  (_req, res) => {
    res.json({ success: true, message: 'Authorized' });
  }
);

testRouter.get(
  '/api/test/rbac/role-manager',
  tenantResolver,
  authenticate,
  authorize,
  requireRole('manager'),
  (_req, res) => {
    res.json({ success: true, message: 'Authorized' });
  }
);

testRouter.get(
  '/api/test/rbac/any-permissions',
  tenantResolver,
  authenticate,
  authorize,
  requireAnyPermission(['tenant.manage', 'store.manage']),
  (_req, res) => {
    res.json({ success: true, message: 'Authorized' });
  }
);

testRouter.get(
  '/api/test/rbac/all-permissions',
  tenantResolver,
  authenticate,
  authorize,
  requireAllPermissions(['store.view', 'store.manage']),
  (_req, res) => {
    res.json({ success: true, message: 'Authorized' });
  }
);

testRouter.get(
  '/api/test/rbac/store-scoped-view/:storeId',
  tenantResolver,
  authenticate,
  authorize,
  requirePermission('store.view', 'storeId'),
  (_req, res) => {
    res.json({ success: true, message: 'Authorized' });
  }
);

app.use(testRouter);
const testLayer = (app as any)._router.stack.pop();
const authRouteIndex = (app as any)._router.stack.findIndex(
  (layer: any) => layer.regexp && layer.regexp.toString().includes('auth')
);
if (authRouteIndex !== -1) {
  (app as any)._router.stack.splice(authRouteIndex + 1, 0, testLayer);
} else {
  (app as any)._router.stack.splice(2, 0, testLayer);
}

describe('Role-Based Access Control (RBAC) & Authorization Integration Tests', () => {
  let tenantAUuid: string;

  let tenantAId: number;
  let tenantBId: number;

  let superAdminToken: string;
  let managerToken: string;
  let noRoleUserToken: string;
  let storeStaffToken: string;
  let tenantBUserToken: string;

  const storeId = 42;

  beforeAll(async () => {
    // Programmatically reset, migrate and seed database
    await resetDatabase();
    execSync('npm run db:test:migrate', { stdio: 'ignore' });
    execSync('npm run db:test:seed', { stdio: 'ignore' });

    await connectDatabase();

    // 1. Create Tenant A & Tenant B
    const tenantAUuidRaw = uuidv4();
    const tenantBUuidRaw = uuidv4();

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

    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Tenant B', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantBUuidRaw, slug: `slug-${tenantBUuidRaw}` } }
    );
    const [tBRes]: any = await sequelize.query(`SELECT id, uuid FROM tenants WHERE uuid = :uuid`, {
      replacements: { uuid: tenantBUuidRaw },
    });
    tenantBId = tBRes[0].id;

    // Create Stores
    await sequelize.query(
      `INSERT INTO stores (id, tenant_id, name, slug, status, created_at, updated_at) 
       VALUES (42, :tenantId, 'Store 42', 'store-42', 'active', NOW(), NOW())`,
      { replacements: { tenantId: tenantAId } }
    );

    await sequelize.query(
      `INSERT INTO stores (id, tenant_id, name, slug, status, created_at, updated_at) 
       VALUES (999, :tenantId, 'Store 999', 'store-999', 'active', NOW(), NOW())`,
      { replacements: { tenantId: tenantAId } }
    );

    // 2. Create Users
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

    const superAdminUser = await createTestUser(tenantAId, `superadmin-${uuidv4()}@example.com`);
    const managerUser = await createTestUser(tenantAId, `manager-${uuidv4()}@example.com`);
    const noRoleUser = await createTestUser(tenantAId, `norole-${uuidv4()}@example.com`);
    const storeStaffUser = await createTestUser(tenantAId, `storestaff-${uuidv4()}@example.com`);
    const tenantBUser = await createTestUser(tenantBId, `tenantb-${uuidv4()}@example.com`);

    // 3. Set Up Roles & Permissions Mapping in database
    // We already have seeded permissions (1-14). Let's load the permission IDs from permissions table
    const [dbPermissions]: any = await sequelize.query(`SELECT id, code FROM permissions`);
    const permMap = new Map<string, number>();
    for (const p of dbPermissions) {
      permMap.set(p.code, p.id);
    }

    // Resolve Role IDs from seeded system roles (super_admin = 1, tenant_owner = 2, store_admin = 3, manager = 4, staff = 5, customer = 6)
    const [dbRoles]: any = await sequelize.query(
      `SELECT id, code FROM roles WHERE tenant_id IS NULL`
    );
    const roleMap = new Map<string, number>();
    for (const r of dbRoles) {
      roleMap.set(r.code, r.id);
    }

    // Map permissions to 'manager' role in junction table if not present
    // manager gets: 'tenant.view', 'store.view'
    const managerRoleId = roleMap.get('manager')!;
    const viewTenantPermId = permMap.get('tenant.view')!;
    const viewStorePermId = permMap.get('store.view')!;

    await sequelize.query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at) 
       VALUES (:roleId, :pId, NOW())`,
      { replacements: { roleId: managerRoleId, pId: viewTenantPermId } }
    );
    await sequelize.query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at) 
       VALUES (:roleId, :pId, NOW())`,
      { replacements: { roleId: managerRoleId, pId: viewStorePermId } }
    );

    // Map permissions to 'staff' role: gets 'store.view'
    const staffRoleId = roleMap.get('staff')!;
    await sequelize.query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at) 
       VALUES (:roleId, :pId, NOW())`,
      { replacements: { roleId: staffRoleId, pId: viewStorePermId } }
    );

    // 4. Assign User Roles
    // Super admin assignment
    await UserRole.create({
      tenantId: tenantAId,
      userId: superAdminUser.id,
      roleId: roleMap.get('super_admin')!,
      storeId: null,
    });

    // Manager role (tenant-wide)
    await UserRole.create({
      tenantId: tenantAId,
      userId: managerUser.id,
      roleId: managerRoleId,
      storeId: null,
    });

    // Store staff role (scoped to storeId = 42)
    await UserRole.create({
      tenantId: tenantAId,
      userId: storeStaffUser.id,
      roleId: staffRoleId,
      storeId,
    });

    // 5. Issue JWT tokens
    const signToken = (user: any, tenantId: number) => {
      return jwt.sign(
        { userId: user.id, tenantId, jti: uuidv4(), tokenType: 'access' },
        env.JWT_ACCESS_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );
    };

    superAdminToken = signToken(superAdminUser, tenantAId);
    managerToken = signToken(managerUser, tenantAId);
    noRoleUserToken = signToken(noRoleUser, tenantAId);
    storeStaffToken = signToken(storeStaffUser, tenantAId);
    tenantBUserToken = signToken(tenantBUser, tenantBId);
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Authentication & Tenant Boundaries', () => {
    it('should reject requests with missing authenticated session (401)', async () => {
      const response = await request(app)
        .get('/api/test/rbac/permission-tenant-view')
        .set('X-Tenant-UUID', tenantAUuid);

      console.log('--- ERROR TEXT:', response.text);
      expect(response.status).toBe(401);
    });

    it('should reject requests where user belongs to a different tenant scope (403)', async () => {
      const response = await request(app)
        .get('/api/test/rbac/permission-tenant-view')
        .set('X-Tenant-UUID', tenantAUuid) // Tenant A UUID
        .set('Authorization', `Bearer ${tenantBUserToken}`); // Token for User in Tenant B

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Permission Verification Middlewares', () => {
    it('should grant access to user possessing the required permission (200)', async () => {
      const response = await request(app)
        .get('/api/test/rbac/permission-tenant-view')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject access if user lacks the required permission (403)', async () => {
      const response = await request(app)
        .get('/api/test/rbac/permission-tenant-view')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${noRoleUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Missing required permission');
    });

    it('should allow access if user has any of the requested permissions', async () => {
      // manager doesn't have tenant.manage/store.manage, so expect 403
      const failRes = await request(app)
        .get('/api/test/rbac/any-permissions')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(failRes.status).toBe(403);

      // Super Admin bypasses, so expect 200
      const passRes = await request(app)
        .get('/api/test/rbac/any-permissions')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(passRes.status).toBe(200);
    });
  });

  describe('Role Verification Middlewares', () => {
    it('should grant access to user carrying the required role (200)', async () => {
      const response = await request(app)
        .get('/api/test/rbac/role-manager')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject access to user lacking the required role (403)', async () => {
      const response = await request(app)
        .get('/api/test/rbac/role-manager')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${noRoleUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Super Admin Bypass', () => {
    it('should allow super_admin to access tenant routes without specific tenant-wide assignments', async () => {
      // Super admin does not have direct manager role assignment, but bypasses role checks
      const response = await request(app)
        .get('/api/test/rbac/role-manager')
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Store-Specific Authorization Scopes', () => {
    it('should allow tenant-wide managers to view any store scoped view', async () => {
      // Tenant-wide roles (storeId is null) cover all stores
      const response = await request(app)
        .get(`/api/test/rbac/store-scoped-view/${storeId}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow store-scoped staff to view their assigned store view', async () => {
      const response = await request(app)
        .get(`/api/test/rbac/store-scoped-view/${storeId}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${storeStaffToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject store-scoped staff attempting to view a different store scope', async () => {
      const nonAssignedStoreId = 999;
      const response = await request(app)
        .get(`/api/test/rbac/store-scoped-view/${nonAssignedStoreId}`)
        .set('X-Tenant-UUID', tenantAUuid)
        .set('Authorization', `Bearer ${storeStaffToken}`);

      expect(response.status).toBe(403);
    });
  });
});
