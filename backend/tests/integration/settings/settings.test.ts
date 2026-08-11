/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Settings & Configuration Module', () => {
  let tenantId: number;
  let storeId: number;
  let userId: number;
  let adminToken: string;
  let readerToken: string;
  let tenantUuid: string;

  let otherTenantId: number;
  let otherAdminToken: string;
  let otherTenantUuid: string;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Settings Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Settings', 'Admin', 'active', 0, NOW(), NOW())`,
      { replacements: { tId: tenantId, uuid: userUuid, email: `admin-${tenantUuid}@test.com` } }
    );
    const [uRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: userUuid },
    });
    userId = uRows[0].id;

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 2, :tId, NOW())`,
      { replacements: { uId: userId, tId: tenantId } }
    );

    const store = await Store.create({
      tenantId,
      name: 'Settings Store',
      slug: `store-${tenantUuid}`,
      currency: 'USD',
      timezone: 'UTC',
      language: 'en',
      status: 'active',
    } as any);
    storeId = store.id;

    adminToken = jwt.sign(
      { userId, userUuid, tenantId, tenantUuid, email: `admin-${tenantUuid}@test.com` },
      env.JWT_ACCESS_SECRET
    );

    // Reader user without permissions
    const readerUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Reader', 'User', 'active', 0, NOW(), NOW())`,
      { replacements: { tId: tenantId, uuid: readerUuid, email: `reader-${tenantUuid}@test.com` } }
    );
    const [rRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: readerUuid },
    });
    const readerUserId = rRows[0].id;

    readerToken = jwt.sign(
      { userId: readerUserId, userUuid: readerUuid, tenantId, tenantUuid, email: `reader-${tenantUuid}@test.com` },
      env.JWT_ACCESS_SECRET
    );

    // Other Tenant Setup
    otherTenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Other Settings Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: otherTenantUuid, slug: `slug-${otherTenantUuid}` } }
    );
    const [otRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: otherTenantUuid },
    });
    otherTenantId = otRows[0].id;

    const otherUserUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Other', 'User', 'active', 0, NOW(), NOW())`,
      { replacements: { tId: otherTenantId, uuid: otherUserUuid, email: `other-${otherTenantUuid}@test.com` } }
    );
    const [ouRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: otherUserUuid },
    });
    const otherUserId = ouRows[0].id;

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 2, :tId, NOW())`,
      { replacements: { uId: otherUserId, tId: otherTenantId } }
    );

    await Store.create({
      tenantId: otherTenantId,
      name: 'Other Settings Store',
      slug: `store-${otherTenantUuid}`,
      currency: 'USD',
      timezone: 'UTC',
      language: 'en',
      status: 'active',
    } as any);

    otherAdminToken = jwt.sign(
      { userId: otherUserId, userUuid: otherUserUuid, tenantId: otherTenantId, tenantUuid: otherTenantUuid, email: `other-${otherTenantUuid}@test.com` },
      env.JWT_ACCESS_SECRET
    );
  }, 60000);

  describe('Tenant Settings API', () => {
    it('should update tenant settings in bulk', async () => {
      const res = await request(app)
        .put('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          settings: {
            company_name: 'Comzilo Inc.',
            invoice_prefix: 'INV-TENANT',
            default_currency: 'USD',
            tax_rate: 15,
          },
          category: 'invoice',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.company_name).toBe('Comzilo Inc.');
    });

    it('should retrieve tenant settings', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid);

      expect(res.status).toBe(200);
      expect(res.body.data.invoice_prefix).toBe('INV-TENANT');
    });

    it('should update single tenant setting key', async () => {
      const res = await request(app)
        .put('/api/v1/tenant-settings/single')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          key: 'date_format',
          value: 'YYYY-MM-DD',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.value).toBe('YYYY-MM-DD');
    });
  });

  describe('Store Settings API', () => {
    it('should update store settings in bulk', async () => {
      const res = await request(app)
        .put(`/api/v1/store-settings/${storeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          settings: {
            receipt_header: 'Welcome to Comzilo Store!',
            receipt_footer: 'Thank you for shopping with us!',
            local_tax_rate: 8.5,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.receipt_header).toBe('Welcome to Comzilo Store!');
    });

    it('should retrieve store settings', async () => {
      const res = await request(app)
        .get(`/api/v1/store-settings/${storeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.receipt_footer).toBe('Thank you for shopping with us!');
    });
  });

  describe('Global Configuration & Feature Flags API', () => {
    it('should update global configuration setting', async () => {
      const res = await request(app)
        .put('/api/v1/configuration')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          key: 'system_theme',
          value: 'dark',
          category: 'theme',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.value).toBe('dark');
    });

    it('should update feature flags', async () => {
      const res = await request(app)
        .put('/api/v1/configuration/feature-flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .send({
          flags: {
            loyalty: false,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.loyalty).toBe(false);
    });

    it('should retrieve settings history', async () => {
      const res = await request(app)
        .get('/api/v1/configuration/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Resolved Settings Hierarchy API', () => {
    it('should resolve settings hierarchy correctly', async () => {
      const res = await request(app)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.company_name).toBe('Comzilo Inc.');
      expect(res.body.data.receipt_header).toBe('Welcome to Comzilo Store!');
    });

    it('should resolve single key hierarchy', async () => {
      const res = await request(app)
        .get('/api/v1/settings/receipt_header')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.value).toBe('Welcome to Comzilo Store!');
    });
  });

  describe('Isolation & Security Tests', () => {
    it('should block user without settings permission', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid);

      expect(res.status).toBe(403);
    });

    it('should enforce tenant isolation between tenants', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-settings')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid);

      expect(res.status).toBe(200);
      expect(res.body.data.company_name).toBeUndefined();
    });
  });
});
