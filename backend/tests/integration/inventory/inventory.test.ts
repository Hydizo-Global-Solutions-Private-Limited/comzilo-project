/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store, Product, Warehouse, WarehouseLocation } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Inventory & Stock Management Module', () => {
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

  let testProductId: number;

  beforeAll(async () => {
    // 1. Create main test tenant and user
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Inventory Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Inventory', 'Admin', 'active', 0, NOW(), NOW())`,
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
      name: 'Inventory Store',
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

    // Create a product
    const product = await Product.create({
      tenantId,
      storeId,
      name: 'Test Product',
      slug: `product-${tenantUuid}`,
      sku: `sku-${tenantUuid}`,
      price: 100,
      status: 'active',
      visibility: 'public',
    } as any);
    testProductId = product.id;
  }, 60000);

  describe('Warehouses API', () => {
    let warehouseId: number;

    it('should create a warehouse', async () => {
      const res = await request(app)
        .post('/api/v1/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Main Warehouse',
          code: 'WH-MAIN',
          type: 'physical',
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Main Warehouse');
      expect(res.body.data.isDefault).toBe(true); // First warehouse defaults to true
      warehouseId = res.body.data.id;
    });

    it('should reject creating duplicate code', async () => {
      const res = await request(app)
        .post('/api/v1/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Main Warehouse 2',
          code: 'WH-MAIN',
          type: 'physical',
        });

      expect(res.status).toBe(409);
    });

    it('should set default warehouse', async () => {
      // Create secondary warehouse
      const secondRes = await request(app)
        .post('/api/v1/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Secondary Warehouse',
          code: 'WH-SEC',
          type: 'physical',
          isDefault: false,
        });

      expect(secondRes.status).toBe(201);
      const secondWhId = secondRes.body.data.id;

      // Set second as default
      const res = await request(app)
        .patch(`/api/v1/warehouses/${secondWhId}/default`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);

      // Verify first is no longer default
      const firstRes = await request(app)
        .get(`/api/v1/warehouses/${warehouseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(firstRes.body.data.isDefault).toBe(false);

      // Revert first back to default for subsequent tests
      await request(app)
        .patch(`/api/v1/warehouses/${warehouseId}/default`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());
    });

    it('should reject unsetting default warehouse', async () => {
      const res = await request(app)
        .put(`/api/v1/warehouses/${warehouseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          isDefault: false,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Warehouse Locations API', () => {
    let whId: number;

    beforeAll(async () => {
      const wh = await Warehouse.findOne({ where: { tenantId, storeId } });
      whId = wh!.id;
    });

    it('should create a location', async () => {
      const res = await request(app)
        .post(`/api/v1/warehouses/${whId}/locations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Row A Bin 1',
          code: 'LOC-A1',
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(true);
    });

    it('should reject creating duplicate location code inside warehouse', async () => {
      const res = await request(app)
        .post(`/api/v1/warehouses/${whId}/locations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Row A Bin 1 Duplicate',
          code: 'LOC-A1',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('Inventory Operations & Stock Mutations', () => {
    let whId: number;
    let locId: number;

    beforeAll(async () => {
      const wh = await Warehouse.findOne({ where: { tenantId, storeId } });
      whId = wh!.id;
      const loc = await WarehouseLocation.findOne({ where: { warehouseId: whId } });
      locId = loc!.id;
    });

    it('should record stock-in movement', async () => {
      const res = await request(app)
        .post('/api/v1/stock-movements/stock-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          quantity: 100,
          reason: 'Initial Inbound',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.quantityOnHand).toBe(100);
      expect(res.body.data.quantityAvailable).toBe(100);
    });

    it('should reject stock-out with insufficient availability', async () => {
      const res = await request(app)
        .post('/api/v1/stock-movements/stock-out')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          quantity: 150,
          reason: 'Oversell attempt',
        });

      expect(res.status).toBe(400);
    });

    it('should record stock-out successfully', async () => {
      const res = await request(app)
        .post('/api/v1/stock-movements/stock-out')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          quantity: 40,
          reason: 'Sale dispatch',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.quantityOnHand).toBe(60);
      expect(res.body.data.quantityAvailable).toBe(60);
    });
  });

  describe('Stock Adjustments API', () => {
    let whId: number;
    let locId: number;
    let adjId: number;

    beforeAll(async () => {
      const wh = await Warehouse.findOne({ where: { tenantId, storeId } });
      whId = wh!.id;
      const loc = await WarehouseLocation.findOne({ where: { warehouseId: whId } });
      locId = loc!.id;
    });

    it('should request a stock adjustment', async () => {
      const res = await request(app)
        .post('/api/v1/stock-adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          adjustmentType: 'increase',
          quantity: 20,
          reasonCode: 'audit_correction',
          notes: 'Found missing box during audit',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
      adjId = res.body.data.id;
    });

    it('should approve adjustment and mutate stock', async () => {
      const res = await request(app)
        .post(`/api/v1/stock-adjustments/${adjId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');

      // Verify stock increased: 60 + 20 = 80
      const balRes = await request(app)
        .get(`/api/v1/inventory/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(balRes.body.data[0].quantityOnHand).toBe(80);
    });

    it('should prevent double approval of adjustment', async () => {
      const res = await request(app)
        .post(`/api/v1/stock-adjustments/${adjId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200); // Idempotent return

      // Verify stock did not increase again
      const balRes = await request(app)
        .get(`/api/v1/inventory/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(balRes.body.data[0].quantityOnHand).toBe(80);
    });
  });

  describe('Stock Transfers API', () => {
    let sourceWhId: number;
    let destWhId: number;
    let sourceLocId: number;
    let destLocId: number;
    let transferId: number;

    beforeAll(async () => {
      const sourceWh = await Warehouse.findOne({ where: { tenantId, storeId, code: 'WH-MAIN' } });
      sourceWhId = sourceWh!.id;
      const destWh = await Warehouse.findOne({ where: { tenantId, storeId, code: 'WH-SEC' } });
      destWhId = destWh!.id;

      const sourceLoc = await WarehouseLocation.findOne({ where: { warehouseId: sourceWhId } });
      sourceLocId = sourceLoc!.id;

      // Create a location in destination warehouse
      const destLocRes = await request(app)
        .post(`/api/v1/warehouses/${destWhId}/locations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          name: 'Sec Row A Bin 1',
          code: 'LOC-SEC-A1',
        });
      destLocId = destLocRes.body.data.id;
    });

    it('should create a stock transfer request', async () => {
      const res = await request(app)
        .post('/api/v1/stock-transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          sourceWarehouseId: sourceWhId,
          destinationWarehouseId: destWhId,
          items: [
            {
              productId: testProductId,
              sourceLocationId: sourceLocId,
              destinationLocationId: destLocId,
              requestedQuantity: 30,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('draft');
      transferId = res.body.data.id;
    });

    it('should submit and approve transfer', async () => {
      await request(app)
        .post(`/api/v1/stock-transfers/${transferId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      const res = await request(app)
        .post(`/api/v1/stock-transfers/${transferId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });

    it('should ship transfer and deduct source stock', async () => {
      const res = await request(app)
        .post(`/api/v1/stock-transfers/${transferId}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_transit');

      // Verify source stock is reduced: 80 - 30 = 50
      const srcBal = await request(app)
        .get(`/api/v1/inventory/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      const sourceRecord = srcBal.body.data.find((b: any) => b.warehouseId === sourceWhId);
      expect(sourceRecord.quantityOnHand).toBe(50);
    });

    it('should receive transfer and increase destination stock', async () => {
      const res = await request(app)
        .post(`/api/v1/stock-transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          items: [
            {
              productId: testProductId,
              receivedQuantity: 30,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('received');

      // Verify dest stock is increased: 0 + 30 = 30
      const destBal = await request(app)
        .get(`/api/v1/inventory/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      const destRecord = destBal.body.data.find((b: any) => b.warehouseId === destWhId);
      expect(destRecord.quantityOnHand).toBe(30);
    });
  });

  describe('Stock Reservations API', () => {
    let whId: number;
    let locId: number;
    let resId: number;

    beforeAll(async () => {
      const wh = await Warehouse.findOne({ where: { tenantId, storeId, code: 'WH-MAIN' } });
      whId = wh!.id;
      const loc = await WarehouseLocation.findOne({ where: { warehouseId: whId } });
      locId = loc!.id;
    });

    it('should reserve stock (reduce available, keep hand)', async () => {
      const res = await request(app)
        .post('/api/v1/stock-reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          referenceType: 'POS',
          referenceId: 'pos_111',
          items: [
            {
              warehouseId: whId,
              warehouseLocationId: locId,
              productId: testProductId,
              quantity: 10,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('active');
      resId = res.body.data.id;

      // Verify stock calculations: Hand=50, Reserved=10, Available=40
      const balRes = await request(app)
        .get(`/api/v1/inventory/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      const sourceRecord = balRes.body.data.find((b: any) => b.warehouseId === whId);
      expect(sourceRecord.quantityOnHand).toBe(50);
      expect(sourceRecord.quantityReserved).toBe(10);
      expect(sourceRecord.quantityAvailable).toBe(40);
    });

    it('should fulfill reservation (reduce hand and reserved)', async () => {
      const res = await request(app)
        .post(`/api/v1/stock-reservations/${resId}/fulfill`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('fulfilled');

      // Verify stock calculations: Hand=40, Reserved=0, Available=40
      const balRes = await request(app)
        .get(`/api/v1/inventory/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      const sourceRecord = balRes.body.data.find((b: any) => b.warehouseId === whId);
      expect(sourceRecord.quantityOnHand).toBe(40);
      expect(sourceRecord.quantityReserved).toBe(0);
      expect(sourceRecord.quantityAvailable).toBe(40);
    });
  });

  describe('Concurrency & Safety Verification', () => {
    let whId: number;
    let locId: number;

    beforeAll(async () => {
      const wh = await Warehouse.findOne({ where: { tenantId, storeId, code: 'WH-MAIN' } });
      whId = wh!.id;
      const loc = await WarehouseLocation.findOne({ where: { warehouseId: whId } });
      locId = loc!.id;

      // Set stock to exactly 15
      await request(app)
        .post('/api/v1/stock-movements/stock-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          quantity: 15, // Hand: 40 + 15 = 55
        });
    });

    it('should prevent overselling on concurrent stock-out requests', async () => {
      // Current Hand: 55. We try to deduct 30 in parallel twice (total 60). One must fail!
      const req1 = request(app)
        .post('/api/v1/stock-movements/stock-out')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          quantity: 30,
        });

      const req2 = request(app)
        .post('/api/v1/stock-movements/stock-out')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          warehouseId: whId,
          warehouseLocationId: locId,
          productId: testProductId,
          quantity: 30,
        });

      const results = await Promise.all([req1, req2]);
      const statuses = results.map((r) => r.status);

      expect(statuses).toContain(200);
      expect(statuses).toContain(400); // One must throw insufficient stock error!
    });
  });

  describe('Security & Multi-Tenant Scoping Boundaries', () => {
    let whId: number;

    beforeAll(async () => {
      const wh = await Warehouse.findOne({ where: { tenantId, storeId, code: 'WH-MAIN' } });
      whId = wh!.id;
    });

    it('should reject accessing other tenant warehouse context', async () => {
      const res = await request(app)
        .get(`/api/v1/warehouses/${whId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404); // Scoped check returns Not Found
    });

    it('should allow Super Admin to bypass tenant restrictions', async () => {
      const res = await request(app)
        .get(`/api/v1/warehouses/${whId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
    });

    it('should reject requests with missing token', async () => {
      const res = await request(app)
        .get('/api/v1/warehouses')
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(401);
    });

    it('should reject requests with missing permission', async () => {
      const res = await request(app)
        .get('/api/v1/warehouses')
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });
  });
});
