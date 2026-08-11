/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';
import { Store } from '../../../src/database/models/store';

describe('Product Catalog Integration Tests', () => {
  let tenantId: number;
  let storeId: number;
  let adminToken: string;
  let testProductId: number;
  let tenantUuid: string;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Product Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );

    // Fetch inserted tenant ID
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Admin', 'User', 'active', 0, NOW(), NOW())`,
      { replacements: { tId: tenantId, uuid: userUuid, email: `admin-${tenantUuid}@test.com` } }
    );

    const [uRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: userUuid },
    });
    const userId = uRows[0].id;

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 1, :tId, NOW())`,
      { replacements: { uId: userId, tId: tenantId } }
    );

    const storeSlug = `test-store-${tenantUuid}`;
    const store = await Store.create({
      tenantId,
      name: 'Test Store',
      slug: storeSlug,
      currency: 'USD',
      timezone: 'UTC',
      language: 'en',
    } as any);
    storeId = store.id;

    adminToken = jwt.sign(
      {
        userId,
        userUuid,
        tenantId,
        tenantUuid,
        email: `admin-${tenantUuid}@test.com`,
      },
      env.JWT_ACCESS_SECRET
    );
  });

  it('should create a new product', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', tenantUuid)
      .set('X-Store-ID', storeId.toString())
      .send({
        name: 'Test Product',
        sku: 'TEST-SKU-001',
        price: 99.99,
        status: 'active',
        visibility: 'public',
      });

    if (response.status !== 201) {
      console.log('RESPONSE BODY ON FAIL:', JSON.stringify(response.body, null, 2));
    }
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Product');
    expect(response.body.data.slug).toBe('test-product');

    testProductId = response.body.data.id;
  });

  it('should list products', async () => {
    const response = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', tenantUuid)
      .set('X-Store-ID', storeId.toString());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].id).toBe(testProductId);
  });

  it('should get product by id', async () => {
    const response = await request(app)
      .get(`/api/v1/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', tenantUuid)
      .set('X-Store-ID', storeId.toString());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(testProductId);
  });

  it('should update product', async () => {
    const response = await request(app)
      .put(`/api/v1/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', tenantUuid)
      .set('X-Store-ID', storeId.toString())
      .send({
        price: 109.99,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Number(response.body.data.price)).toBe(109.99);
  });

  it('should delete product (soft delete)', async () => {
    const response = await request(app)
      .delete(`/api/v1/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', tenantUuid)
      .set('X-Store-ID', storeId.toString());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should restore product', async () => {
    const response = await request(app)
      .post(`/api/v1/products/${testProductId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', tenantUuid)
      .set('X-Store-ID', storeId.toString());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.deletedAt).toBeNull();
  });
});
