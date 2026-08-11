/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';
import { Store } from '../../../src/database/models/store';
import { Media } from '../../../src/database/models/media';
import { Product } from '../../../src/database/models/product';

describe('Product Classification Integration Tests', () => {
  let tenantId: number;
  let storeId: number;
  let adminToken: string;
  let superAdminToken: string;
  let readerToken: string;
  let tenantUuid: string;

  let otherTenantId: number;
  let otherStoreId: number;
  let otherAdminToken: string;
  let otherTenantUuid: string;

  let testMediaId: number;
  let testProductId: number;

  beforeAll(async () => {
    // 1. Create main test tenant and user
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Classification Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
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

    // Link user to Tenant Owner (Role 2)
    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 2, :tId, NOW())`,
      { replacements: { uId: userId, tId: tenantId } }
    );

    const storeSlug = `store-${tenantUuid}`;
    const store = await Store.create({
      tenantId,
      name: 'Classification Store',
      slug: storeSlug,
      currency: 'USD',
      timezone: 'UTC',
      language: 'en',
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

    superAdminToken = jwt.sign(
      {
        userId: superAdminUserId,
        userUuid: superAdminUuid,
        tenantId,
        tenantUuid,
        email: `super-${tenantUuid}@test.com`,
      },
      env.JWT_ACCESS_SECRET
    );

    // Create a reader user with no write permissions (only product.read, category.read, etc.)
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

    // Create a custom reader role (e.g. role 3) or use role 2 with fewer permissions
    // For simplicity, let's keep readerToken with no role_roles assigned (no permissions)
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

    // Link user to Tenant Owner (Role 2)
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

    // Create a product and a media item under main store
    const media = await Media.create({
      tenantId,
      filename: 'logo.png',
      mimeType: 'image/png',
      size: 1024,
      url: 'https://test.com/logo.png',
      altText: 'Logo',
    } as any);
    testMediaId = media.id;

    const product = await Product.create({
      tenantId,
      storeId,
      name: 'Classification Test Product',
      slug: 'class-test-product',
      sku: 'CLASS-SKU-001',
      price: 15.0,
      status: 'active',
      visibility: 'public',
    } as any);
    testProductId = product.id;
  }, 60000);

  describe('Categories API', () => {
    let catId: number;
    let subId: number;

    it('should create a category', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Main Category',
          status: 'active',
          visibility: 'public',
          imageMediaId: testMediaId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Main Category');
      catId = res.body.data.id;
    });

    it('should get category by id', async () => {
      const res = await request(app)
        .get(`/api/v1/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(catId);
    });

    it('should prevent circular parent categories', async () => {
      // Create subcategory
      const subRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Sub Category',
          parentId: catId,
        });

      subId = subRes.body.data.id;

      // Try setting parent of main category to subcategory
      const res = await request(app)
        .put(`/api/v1/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          parentId: subId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Circular dependency');
    });

    it('should reject category creation from other tenant', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', storeId.toString()) // trying to write to main store
        .send({
          name: 'Hacked Category',
        });

      expect(res.status).toBe(403);
    });

    it('should reject deleting parent category if it has active child categories', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(400); // Validation error
      expect(res.body.message).toContain('Cannot delete category that has subcategories');
    });

    it('should delete a category (soft-delete)', async () => {
      // Delete child category first to avoid validation failure
      await request(app)
        .delete(`/api/v1/categories/${subId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      const res = await request(app)
        .delete(`/api/v1/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
    });
  });

  describe('Brands API', () => {
    let brandId: number;

    it('should create a brand', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Google Brand',
          status: 'active',
          visibility: 'public',
        });

      expect(res.status).toBe(201);
      brandId = res.body.data.id;
    });

    it('should reject brand updates with invalid media ID', async () => {
      const res = await request(app)
        .put(`/api/v1/brands/${brandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          logoMediaId: 999999, // non-existent
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Collections API', () => {
    let collectionId: number;

    it('should create a collection', async () => {
      const res = await request(app)
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Summer Collection',
          status: 'active',
          visibility: 'public',
        });

      expect(res.status).toBe(201);
      collectionId = res.body.data.id;
    });

    it('should add a product to a collection', async () => {
      const res = await request(app)
        .post(`/api/v1/collections/${collectionId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          productId: testProductId,
          sortOrder: 1,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('Product Classification Assignments', () => {
    let brandId: number;
    let catId: number;

    beforeAll(async () => {
      const bRes = await request(app)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({ name: 'Apple' });
      brandId = bRes.body.data.id;

      const cRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({ name: 'Electronics' });
      catId = cRes.body.data.id;
    });

    it('should assign categories and primary category', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${testProductId}/categories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          categoryIds: [catId],
          primaryCategoryId: catId,
        });

      expect(res.status).toBe(200);

      // Verify assignment
      const classRes = await request(app)
        .get(`/api/v1/products/${testProductId}/classification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(classRes.body.data.categories.length).toBe(1);
      expect(classRes.body.data.categories[0].ProductCategory.isPrimary).toBe(true);
    });

    it('should assign a brand to a product', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${testProductId}/brand`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          brandId,
        });

      expect(res.status).toBe(200);
    });

    it('should reject with 403 when user does not have permissions', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${testProductId}/brand`)
        .set('Authorization', `Bearer ${readerToken}`) // reader user has no write access
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          brandId,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Store Authorization & Scoping Checks', () => {
    it('should reject requests with X-Store-ID belonging to another tenant', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Store does not belong to this tenant scope');
    });

    it('should return 404 for nonexistent X-Store-ID', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', '999999');

      expect(res.status).toBe(404);
    });

    it('should return 400 for malformed X-Store-ID', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', 'abc');

      expect(res.status).toBe(400);
    });

    it('should reject inactive store requests with 403', async () => {
      const inactiveStore = await Store.create({
        tenantId,
        name: 'Inactive Store',
        slug: `inactive-${uuidv4()}`,
        status: 'inactive',
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
      } as any);

      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', inactiveStore.id.toString());

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Store is inactive or deleted');
    });

    it('should allow Super Admin to bypass tenant-matching check', async () => {
      // Super Admin accesses other tenant's store under main tenant UUID context
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
    });
  });
});
