/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Marketplace, Webhooks & Integrations Module', () => {
  let tenantId: number;
  let storeId: number;
  let userId: number;
  let adminToken: string;
  let readerToken: string;
  let tenantUuid: string;

  let otherTenantId: number;
  let otherStoreId: number;
  let otherAdminToken: string;
  let otherTenantUuid: string;

  let testEndpointId: number;
  let testIntegrationId: number;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Integrations Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Integrations', 'Admin', 'active', 0, NOW(), NOW())`,
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
      name: 'Integrations Store',
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
      {
        userId: readerUserId,
        userUuid: readerUuid,
        tenantId,
        tenantUuid,
        email: `reader-${tenantUuid}@test.com`,
      },
      env.JWT_ACCESS_SECRET
    );

    // Other Tenant Setup
    otherTenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Other Integrations Tenant', :slug, 'active', NOW(), NOW())`,
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
      {
        replacements: {
          tId: otherTenantId,
          uuid: otherUserUuid,
          email: `other-${otherTenantUuid}@test.com`,
        },
      }
    );
    const [ouRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: otherUserUuid },
    });
    const otherUserId = ouRows[0].id;

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 2, :tId, NOW())`,
      { replacements: { uId: otherUserId, tId: otherTenantId } }
    );

    const otherStore = await Store.create({
      tenantId: otherTenantId,
      name: 'Other Integrations Store',
      slug: `store-${otherTenantUuid}`,
      currency: 'USD',
      timezone: 'UTC',
      language: 'en',
      status: 'active',
    } as any);
    otherStoreId = otherStore.id;

    otherAdminToken = jwt.sign(
      {
        userId: otherUserId,
        userUuid: otherUserUuid,
        tenantId: otherTenantId,
        tenantUuid: otherTenantUuid,
        email: `other-${otherTenantUuid}@test.com`,
      },
      env.JWT_ACCESS_SECRET
    );
  });

  describe('Webhook Endpoints API', () => {
    it('should register a new webhook endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Order Created Webhook',
          targetUrl: 'https://api.external.com/webhooks/order-created',
          events: ['order.created', 'order.updated'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Order Created Webhook');
      testEndpointId = res.body.data.id;
    });

    it('should list registered webhook endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a webhook endpoint', async () => {
      const res = await request(app)
        .put(`/api/v1/webhooks/${testEndpointId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Order Created Webhook Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Order Created Webhook Updated');
    });

    it('should manually trigger a webhook event and log delivery', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          eventType: 'order.created',
          payload: { orderId: 100, amount: 250.0 },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve delivery logs for an endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/webhooks/${testEndpointId}/logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('External Integrations API', () => {
    it('should list marketplace apps', async () => {
      const res = await request(app)
        .get('/api/v1/integrations/marketplace')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    });

    it('should connect a new Shopify integration', async () => {
      const res = await request(app)
        .post('/api/v1/integrations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          provider: 'shopify',
          name: 'My Shopify Store',
          config: { apiKey: 'shpat_xxx', shopUrl: 'mystore.myshopify.com' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.provider).toBe('shopify');
      testIntegrationId = res.body.data.id;
    });

    it('should list connected integrations', async () => {
      const res = await request(app)
        .get('/api/v1/integrations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should trigger integration data sync', async () => {
      const res = await request(app)
        .post(`/api/v1/integrations/${testIntegrationId}/sync`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          syncType: 'orders',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('success');
    });

    it('should retrieve sync logs for integration', async () => {
      const res = await request(app)
        .get(`/api/v1/integrations/${testIntegrationId}/logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should disconnect an integration', async () => {
      const res = await request(app)
        .post(`/api/v1/integrations/${testIntegrationId}/disconnect`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('disconnected');
    });
  });

  describe('Isolation & Security Tests', () => {
    it('should block user without permissions', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks')
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid);

      expect(res.status).toBe(403);
    });

    it('should enforce tenant isolation across tenants', async () => {
      const res = await request(app)
        .get(`/api/v1/webhooks/${testEndpointId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });
  });
});
