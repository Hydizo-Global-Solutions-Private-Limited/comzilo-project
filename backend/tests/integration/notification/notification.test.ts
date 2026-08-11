/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Notifications & Communication Module', () => {
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

  let testTemplateId: number;
  let testNotificationId: number;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Notif Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Notif', 'Admin', 'active', 0, NOW(), NOW())`,
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
      name: 'Notif Store',
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
       VALUES (:uuid, 'Other Notif Tenant', :slug, 'active', NOW(), NOW())`,
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
      name: 'Other Store',
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
  }, 60000);

  describe('Notification Templates API', () => {
    it('should create a new notification template', async () => {
      const res = await request(app)
        .post('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          code: 'order_created',
          name: 'Order Created Confirmation',
          channel: 'email',
          subject: 'Order {{orderNumber}} Confirmed!',
          body: 'Hello {{customerName}}, your order {{orderNumber}} of amount {{amount}} is placed.',
          variables: ['customerName', 'orderNumber', 'amount'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('order_created');
      testTemplateId = res.body.data.id;
    });

    it('should retrieve notification templates list', async () => {
      const res = await request(app)
        .get('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a notification template', async () => {
      const res = await request(app)
        .put(`/api/v1/notification-templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Order Confirmation Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Order Confirmation Updated');
    });
  });

  describe('Notification Preferences API', () => {
    it('should retrieve user notification preferences', async () => {
      const res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.emailEnabled).toBe(true);
    });

    it('should update user notification preferences', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          marketingNotifications: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.marketingNotifications).toBe(true);
    });
  });

  describe('Notification Send & In-App Management API', () => {
    it('should send a notification using template placeholders', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          userId,
          recipient: `admin-${tenantUuid}@test.com`,
          channel: 'in_app',
          templateCode: 'order_created',
          variables: {
            customerName: 'John Doe',
            orderNumber: 'ORD-1001',
            amount: '$250.00',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toContain(
        'Hello John Doe, your order ORD-1001 of amount $250.00 is placed.'
      );
      testNotificationId = res.body.data.id;
    });

    it('should retrieve unread notification count', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('should list in-app notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should mark in-app notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('read');
    });

    it('should mark all in-app notifications as read', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBeDefined();
    });

    it('should delete a notification', async () => {
      const res = await request(app)
        .delete(`/api/v1/notifications/${testNotificationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
    });
  });

  describe('Isolation & RBAC Security', () => {
    it('should block unauthorized user missing permissions', async () => {
      const res = await request(app)
        .get('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });

    it('should enforce tenant isolation in templates access', async () => {
      const res = await request(app)
        .get(`/api/v1/notification-templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });
  });
});
