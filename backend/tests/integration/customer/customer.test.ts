/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store, CustomerAddress, Media } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Customer Management Module', () => {
  let tenantId: number;
  let storeId: number;
  let adminToken: string;
  let readerToken: string;
  let tenantUuid: string;

  let otherTenantId: number;
  let otherStoreId: number;
  let otherAdminToken: string;
  let otherTenantUuid: string;

  let testCustomerId: number;
  let testAddressId: number;
  let testMediaId: number;

  beforeAll(async () => {
    // 1. Create main test tenant and user
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Customer Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Customer', 'Admin', 'active', 0, NOW(), NOW())`,
      { replacements: { tId: tenantId, uuid: userUuid, email: `admin-${tenantUuid}@test.com` } }
    );
    const [uRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: userUuid },
    });
    const userId = uRows[0].id;

    // Link user to Tenant Owner (Role 2)
    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 2, :tId, NOW())`,
      { replacements: { uId: userId, tId: tenantId } }
    );

    const storeSlug = `store-${tenantUuid}`;
    const store = await Store.create({
      tenantId,
      name: 'Customer Store',
      slug: storeSlug,
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

    // Create a Super Admin user and sign superAdminToken
    const superAdminUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Super', 'Admin', 'active', 0, NOW(), NOW())`,
      {
        replacements: {
          tId: tenantId,
          uuid: superAdminUuid,
          email: `super-${tenantUuid}@test.com`,
        },
      }
    );
    const [saRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: superAdminUuid },
    });
    const superAdminUserId = saRows[0].id;

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 1, :tId, NOW())`,
      { replacements: { uId: superAdminUserId, tId: tenantId } }
    );

    // Reader user with no permissions
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

    // 2. Create other tenant to test cross-tenant access restriction
    otherTenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Other Tenant', :slug, 'active', NOW(), NOW())`,
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

    // Create a mock media record to use for doc uploads and profile images
    const media = await Media.create({
      tenantId,
      filename: 'tax.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      url: 'https://example.com/tax.pdf',
    } as any);
    testMediaId = media.id;
  }, 60000);

  describe('Customers CRUD API', () => {
    it('should create a new customer', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          phone: '+1234567890',
          customerType: 'individual',
        });

      if (res.status !== 201) console.log('CREATE CUSTOMER ERROR:', res.body);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('John Doe');
      expect(res.body.data.customerCode).toBeDefined();
      testCustomerId = res.body.data.id;
    });

    it('should reject creating duplicate email inside same tenant', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          phone: '+1987654321',
        });

      expect(res.status).toBe(409);
    });

    it('should retrieve a customer', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('john.doe@test.com');
      expect(res.body.data.preference).toBeDefined();
    });

    it('should list customers with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .query({ search: 'John', page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
    });

    it('should block a customer', async () => {
      const res = await request(app)
        .post(`/api/v1/customers/${testCustomerId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('blocked');
    });

    it('should unblock a customer', async () => {
      const res = await request(app)
        .post(`/api/v1/customers/${testCustomerId}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });
  });

  describe('Customer Addresses API', () => {
    it('should create a customer address', async () => {
      const res = await request(app)
        .post(`/api/v1/customers/${testCustomerId}/addresses`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          addressType: 'home',
          fullName: 'John Home',
          phone: '+1234567890',
          addressLine1: '100 Main St',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          postalCode: '90001',
          isDefaultBilling: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDefaultBilling).toBe(true);
      testAddressId = res.body.data.id;
    });

    it('should enforce only one default billing address', async () => {
      // Create second address as default billing
      const res = await request(app)
        .post(`/api/v1/customers/${testCustomerId}/addresses`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          addressType: 'office',
          fullName: 'John Office',
          phone: '+1234567890',
          addressLine1: '200 Corporate Way',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          postalCode: '90002',
          isDefaultBilling: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDefaultBilling).toBe(true);

      // Verify the first address is no longer default billing
      const firstAddr = await CustomerAddress.findByPk(testAddressId);
      expect(firstAddr!.isDefaultBilling).toBe(false);
    });
  });

  describe('Customer Preferences API', () => {
    it('should retrieve preferences', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${testCustomerId}/preferences`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.emailNotifications).toBe(true);
    });

    it('should update preferences', async () => {
      const res = await request(app)
        .put(`/api/v1/customers/${testCustomerId}/preferences`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          emailNotifications: false,
          preferredLanguage: 'es',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.emailNotifications).toBe(false);
      expect(res.body.data.preferredLanguage).toBe('es');
    });
  });

  describe('Customer Tags API', () => {
    it('should replace customer tags', async () => {
      const res = await request(app)
        .put(`/api/v1/customers/${testCustomerId}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          tags: ['VIP', 'Corporate'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('Customer Notes API', () => {
    it('should create and list customer notes', async () => {
      const createRes = await request(app)
        .post(`/api/v1/customers/${testCustomerId}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({ note: 'This customer prefers eco-friendly packaging.' });

      expect(createRes.status).toBe(201);

      const listRes = await request(app)
        .get(`/api/v1/customers/${testCustomerId}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].note).toBe('This customer prefers eco-friendly packaging.');
    });
  });

  describe('Customer Documents API', () => {
    it('should upload and remove documents', async () => {
      const uploadRes = await request(app)
        .post(`/api/v1/customers/${testCustomerId}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          mediaId: testMediaId,
          documentType: 'gst_certificate',
        });

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.id;

      const listRes = await request(app)
        .get(`/api/v1/customers/${testCustomerId}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);

      const deleteRes = await request(app)
        .delete(`/api/v1/customer-documents/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(deleteRes.status).toBe(200);
    });
  });

  describe('Security & Tenant Isolation Boundaries', () => {
    it('should reject accessing customer from different tenant context', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });

    it('should reject requests with missing token', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${testCustomerId}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(401);
    });

    it('should reject requests with missing permission', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });
  });
});
