/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { sequelize, connectDatabase, disconnectDatabase } from '../../src/config/database';
import { env } from '../../src/config/env';
import { resetDatabase } from '../../src/database/helpers/reset';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

describe('Database Integration & Integrity Tests', () => {
  beforeAll(async () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.TEST_DB_NAME).toContain('test');

    // Programmatically reset the test database for a clean slate
    await resetDatabase();

    // Programmatically execute migrations and seeders
    execSync('npm run db:test:migrate', { stdio: 'ignore' });
    execSync('npm run db:test:seed', { stdio: 'ignore' });

    await connectDatabase();
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  afterEach(async () => {
    // Clear test-specific mock records to prevent duplicate key conflicts
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('DELETE FROM users WHERE email LIKE "%@test.com"');
    await sequelize.query(
      'DELETE FROM user_roles WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE "%tenant%")'
    );
    await sequelize.query(
      'DELETE FROM stores WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE "%tenant%")'
    );
    await sequelize.query('DELETE FROM store_domains WHERE domain = "mybrand.com"');
    await sequelize.query('DELETE FROM refresh_tokens WHERE token_hash = "hash123"');
    await sequelize.query(
      'DELETE FROM subscriptions WHERE provider_subscription_id = "sub_stripe_123" OR provider = "manual"'
    );
    await sequelize.query('DELETE FROM tenants WHERE slug LIKE "%tenant%"');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  // Helper to insert a mock tenant for testing
  const createMockTenant = async (slug: string): Promise<string> => {
    const uuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, :name, :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid, name: 'Mock Tenant', slug } }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result]: any = await sequelize.query(`SELECT id FROM tenants WHERE slug = :slug`, {
      replacements: { slug },
    });
    return result[0].id;
  };

  const createMockUser = async (tenantId: string, email: string): Promise<string> => {
    const uuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, created_at, updated_at) 
       VALUES (:tenantId, :uuid, :email, 'hash', 'First', 'Last', 'active', NOW(), NOW())`,
      { replacements: { tenantId, uuid, email } }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result]: any = await sequelize.query(
      `SELECT id FROM users WHERE email = :email AND tenant_id = :tenantId`,
      {
        replacements: { email, tenantId },
      }
    );
    return result[0].id;
  };

  const createMockStore = async (tenantId: string, slug: string): Promise<string> => {
    await sequelize.query(
      `INSERT INTO stores (tenant_id, name, slug, currency, timezone, language, status, created_at, updated_at) 
       VALUES (:tenantId, 'Mock Store', :slug, 'INR', 'UTC', 'en', 'active', NOW(), NOW())`,
      { replacements: { tenantId, slug } }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result]: any = await sequelize.query(
      `SELECT id FROM stores WHERE slug = :slug AND tenant_id = :tenantId`,
      {
        replacements: { slug, tenantId },
      }
    );
    return result[0].id;
  };

  it('should verify all expected tables exist programmatically in INFORMATION_SCHEMA', async () => {
    const expectedTables = [
      'plans',
      'feature_flags',
      'plan_features',
      'tenants',
      'stores',
      'store_domains',
      'users',
      'user_profiles',
      'roles',
      'permissions',
      'role_permissions',
      'user_roles',
      'refresh_tokens',
      'login_history',
      'user_devices',
      'otp_requests',
      'password_reset_tokens',
      'store_settings',
      'onboarding_steps',
      'subscriptions',
      'audit_logs',
      'activity_logs',
      'sequelize_meta',
      'sequelize_data',
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [results]: any = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = :dbName`,
      { replacements: { dbName: env.TEST_DB_NAME } }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingTables = results.map((r: any) =>
      (r.TABLE_NAME || r.table_name || '').toLowerCase()
    );
    for (const table of expectedTables) {
      expect(existingTables).toContain(table.toLowerCase());
    }
  });

  it('should reject duplicate system roles (same code and NULL tenant)', async () => {
    // There is already a seeded system role with code 'super_admin'
    await expect(
      sequelize.query(
        `INSERT INTO roles (tenant_id, code, name, is_system, created_at, updated_at) 
         VALUES (NULL, 'super_admin', 'Duplicate Admin', true, NOW(), NOW())`
      )
    ).rejects.toThrow();
  });

  it('should reject duplicate tenant-level user role assignments', async () => {
    const tId = await createMockTenant('role-tenant');
    const uId = await createMockUser(tId, 'role-user@test.com');

    // Create role
    await sequelize.query(
      `INSERT INTO roles (tenant_id, code, name, is_system, created_at, updated_at) 
       VALUES (:tId, 'custom_role', 'Custom Role', false, NOW(), NOW())`,
      { replacements: { tId } }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [roleRes]: any = await sequelize.query(
      `SELECT id FROM roles WHERE code = 'custom_role' AND tenant_id = :tId`,
      {
        replacements: { tId },
      }
    );
    const rId = roleRes[0].id;

    // Assign role at tenant level (store_id = NULL)
    await sequelize.query(
      `INSERT INTO user_roles (tenant_id, user_id, role_id, store_id, assigned_at, created_at, updated_at) 
       VALUES (:tId, :uId, :rId, NULL, NOW(), NOW(), NOW())`,
      { replacements: { tId, uId, rId } }
    );

    // Try assigning again (should fail)
    await expect(
      sequelize.query(
        `INSERT INTO user_roles (tenant_id, user_id, role_id, store_id, assigned_at, created_at, updated_at) 
         VALUES (:tId, :uId, :rId, NULL, NOW(), NOW(), NOW())`,
        { replacements: { tId, uId, rId } }
      )
    ).rejects.toThrow();
  });

  it('should enforce unique emails within the same tenant, but allow identical emails in different tenants', async () => {
    const tA = await createMockTenant('tenant-a');
    const tB = await createMockTenant('tenant-b');

    // Create user in Tenant A
    await createMockUser(tA, 'shared-email@test.com');

    // Duplicate in Tenant A should fail
    await expect(createMockUser(tA, 'shared-email@test.com')).rejects.toThrow();

    // Insertion in Tenant B should succeed
    const uB = await createMockUser(tB, 'shared-email@test.com');
    expect(uB).toBeDefined();
  });

  it('should reject duplicate store domains', async () => {
    const tA = await createMockTenant('domain-tenant-a');
    const sA = await createMockStore(tA, 'domain-store-a');

    await sequelize.query(
      `INSERT INTO store_domains (tenant_id, store_id, domain, domain_type, verification_status, verification_token_hash, created_at, updated_at) 
       VALUES (:tA, :sA, 'mybrand.com', 'custom', 'pending', 'token', NOW(), NOW())`,
      { replacements: { tA, sA } }
    );

    // Try creating duplicate domain on another tenant
    const tB = await createMockTenant('domain-tenant-b');
    const sB = await createMockStore(tB, 'domain-store-b');

    await expect(
      sequelize.query(
        `INSERT INTO store_domains (tenant_id, store_id, domain, domain_type, verification_status, verification_token_hash, created_at, updated_at) 
         VALUES (:tB, :sB, 'mybrand.com', 'custom', 'pending', 'token', NOW(), NOW())`,
        { replacements: { tB, sB } }
      )
    ).rejects.toThrow();
  });

  it('should reject duplicate refresh token hashes', async () => {
    const tId = await createMockTenant('token-tenant');
    const uId = await createMockUser(tId, 'token-user@test.com');

    await sequelize.query(
      `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, family_id, expires_at, created_at, updated_at) 
       VALUES (:tId, :uId, 'hash123', 'family1', DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW())`,
      { replacements: { tId, uId } }
    );

    // Duplicate hash should fail
    await expect(
      sequelize.query(
        `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, family_id, expires_at, created_at, updated_at) 
         VALUES (:tId, :uId, 'hash123', 'family2', DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW())`,
        { replacements: { tId, uId } }
      )
    ).rejects.toThrow();
  });

  it('should reject duplicate permissions', async () => {
    // 'tenant.view' permission is already seeded
    await expect(
      sequelize.query(
        `INSERT INTO permissions (code, name, module, created_at, updated_at) 
         VALUES ('tenant.view', 'Duplicate Tenant View', 'tenant', NOW(), NOW())`
      )
    ).rejects.toThrow();
  });

  it('should enforce provider_subscription_id uniqueness when non-NULL, but allow multiple NULL values', async () => {
    const tA = await createMockTenant('sub-tenant-a');
    const tB = await createMockTenant('sub-tenant-b');
    const tC = await createMockTenant('sub-tenant-c');

    // 1. Multiple NULL values should succeed
    await sequelize.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, starts_at, current_period_start, current_period_end, ends_at, billing_cycle, amount, provider, provider_subscription_id, created_at, updated_at) 
       VALUES (:tA, 1, 'active', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 1 MONTH), 'monthly', 0.00, 'manual', NULL, NOW(), NOW())`,
      { replacements: { tA } }
    );

    await expect(
      sequelize.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, starts_at, current_period_start, current_period_end, ends_at, billing_cycle, amount, provider, provider_subscription_id, created_at, updated_at) 
         VALUES (:tB, 1, 'active', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 1 MONTH), 'monthly', 0.00, 'manual', NULL, NOW(), NOW())`,
        { replacements: { tB } }
      )
    ).resolves.toBeDefined();

    // 2. Duplicate non-NULL provider_subscription_id should fail
    await sequelize.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, starts_at, current_period_start, current_period_end, ends_at, billing_cycle, amount, provider, provider_subscription_id, created_at, updated_at) 
       VALUES (:tC, 1, 'active', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 1 MONTH), 'monthly', 0.00, 'stripe', 'sub_stripe_123', NOW(), NOW())`,
      { replacements: { tC } }
    );

    const tD = await createMockTenant('sub-tenant-d');
    await expect(
      sequelize.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, starts_at, current_period_start, current_period_end, ends_at, billing_cycle, amount, provider, provider_subscription_id, created_at, updated_at) 
         VALUES (:tD, 1, 'active', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 1 MONTH), 'monthly', 0.00, 'stripe', 'sub_stripe_123', NOW(), NOW())`,
        { replacements: { tD } }
      )
    ).rejects.toThrow();
  });

  it('should reject foreign-key violations', async () => {
    // Try adding a store pointing to an invalid tenant ID
    await expect(
      sequelize.query(
        `INSERT INTO stores (tenant_id, name, slug, currency, timezone, language, status, created_at, updated_at) 
         VALUES (99999, 'Invalid Store', 'invalid-slug', 'INR', 'UTC', 'en', 'active', NOW(), NOW())`
      )
    ).rejects.toThrow();
  });
});
