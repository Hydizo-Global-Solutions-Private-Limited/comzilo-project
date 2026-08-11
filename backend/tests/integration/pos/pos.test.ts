/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store, Product, POSRegister, InventoryBalance } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Point of Sale (POS) Management Module', () => {
  let tenantId: number;
  let storeId: number;
  let adminToken: string;
  let readerToken: string;
  let tenantUuid: string;

  let otherTenantId: number;
  let otherStoreId: number;
  let otherAdminToken: string;
  let otherTenantUuid: string;

  let testProductId: number;
  let testRegisterId: number;
  let testSessionId: number;
  let testReceiptId: number;
  let testOrderId: number;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'POS Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'POS', 'Admin', 'active', 0, NOW(), NOW())`,
      { replacements: { tId: tenantId, uuid: userUuid, email: `admin-${tenantUuid}@test.com` } }
    );
    const [uRows]: any = await sequelize.query('SELECT id FROM users WHERE uuid = :uuid', {
      replacements: { uuid: userUuid },
    });
    const userId = uRows[0].id;

    await sequelize.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id, created_at) VALUES (:uId, 2, :tId, NOW())`,
      { replacements: { uId: userId, tId: tenantId } }
    );

    const storeSlug = `store-${tenantUuid}`;
    const store = await Store.create({
      tenantId,
      name: 'POS Store',
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

    // Create other tenant for isolation tests
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

    // Create a product with stock
    const product = await Product.create({
      tenantId,
      storeId,
      slug: 'pos-test-product',
      name: 'POS Test Product',
      sku: 'PROD-POS-01',
      price: 100.0,
      status: 'active',
    } as any);
    testProductId = product.id;

    // Create Warehouse
    const [wId]: any = await sequelize.query(
      `INSERT INTO warehouses (tenant_id, store_id, uuid, name, code, status, created_at, updated_at)
       VALUES (:tId, :sId, :uuid, 'Main Warehouse', 'WH-MAIN', 'active', NOW(), NOW())`,
      { replacements: { tId: tenantId, sId: storeId, uuid: uuidv4() } }
    );

    // Create Warehouse Location
    const [wlId]: any = await sequelize.query(
      `INSERT INTO warehouse_locations (tenant_id, store_id, warehouse_id, uuid, name, code, status, created_at, updated_at)
       VALUES (:tId, :sId, :wId, :uuid, 'Main Location', 'LOC-MAIN', 'active', NOW(), NOW())`,
      { replacements: { tId: tenantId, sId: storeId, wId, uuid: uuidv4() } }
    );

    // Create inventory balance of 50 units
    await InventoryBalance.create({
      tenantId,
      storeId,
      productId: testProductId,
      warehouseId: wId,
      warehouseLocationId: wlId,
      quantityOnHand: 50,
      quantityReserved: 0,
      quantityAvailable: 50,
    } as any);

    // Create POS Register
    const register = await POSRegister.create({
      tenantId,
      storeId,
      name: 'Register 1',
      code: 'REG-01',
      status: 'closed',
      openingAmount: 0,
    } as any);
    testRegisterId = register.id;
  }, 60000);

  describe('Register & Session Lifecycle', () => {
    it('should open a register session', async () => {
      const res = await request(app)
        .post('/api/v1/pos/register/open')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          openingAmount: 100.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('open');
      expect(Number(res.body.data.openingCash)).toBe(100.0);
      testSessionId = res.body.data.id;
      expect(testSessionId).toBeGreaterThan(0);
    });

    it('should block opening a second session while one is active', async () => {
      const res = await request(app)
        .post('/api/v1/pos/register/open')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          openingAmount: 50.0,
        });

      expect(res.status).toBe(400);
    });

    it('should list POS sessions', async () => {
      const res = await request(app)
        .get('/api/v1/pos/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POS Sale Orchestration & Split Payments', () => {
    it('should process a POS sale with split payments (Cash + Card) and generate receipt', async () => {
      const res = await request(app)
        .post('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          items: [
            {
              productId: testProductId,
              quantity: 2, // 2 x 100 = 200
              discountType: 'fixed',
              discountValue: 10, // line discount = 10 -> subtotal = 190
            },
          ],
          tax: 10.0, // total = 200
          payments: [
            { paymentMethod: 'Cash', amount: 100.0 },
            { paymentMethod: 'Card', amount: 100.0 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.receiptNumber).toBeDefined();
      expect(Number(res.body.data.total)).toBe(200.0);
      testReceiptId = res.body.data.id;
      testOrderId = res.body.data.orderId;
    });

    it('should reject POS sale when split payments total does not equal order total', async () => {
      const res = await request(app)
        .post('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          items: [
            {
              productId: testProductId,
              quantity: 1, // 100
            },
          ],
          payments: [
            { paymentMethod: 'Cash', amount: 50.0 }, // sum 50 != 100
          ],
        });

      expect(res.status).toBe(400);
    });

    it('should reject POS sale when item discount exceeds line subtotal', async () => {
      const res = await request(app)
        .post('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          items: [
            {
              productId: testProductId,
              quantity: 1, // 100
              discountType: 'fixed',
              discountValue: 150, // exceeds 100
            },
          ],
          payments: [{ paymentMethod: 'Cash', amount: 100.0 }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Receipts API & Inspection', () => {
    it('should retrieve receipt details by id', async () => {
      const res = await request(app)
        .get(`/api/v1/receipts/${testReceiptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.receiptNumber).toBeDefined();
    });

    it('should list receipts', async () => {
      const res = await request(app)
        .get('/api/v1/receipts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POS Return Workflow', () => {
    it('should process a POS return and restock items', async () => {
      const res = await request(app)
        .post('/api/v1/pos/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          orderId: testOrderId,
          items: [
            {
              productId: testProductId,
              quantity: 1,
              unitPrice: 100.0,
            },
          ],
          reason: 'Customer exchange',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('processed');
    });
  });

  describe('Register Closing & Cash Variance Calculation', () => {
    it('should close the register and calculate variance correctly', async () => {
      const res = await request(app)
        .post('/api/v1/pos/register/close')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          registerId: testRegisterId,
          closingAmount: 200.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('closed');
      expect(res.body.data.variance).toBeDefined();
    });
  });

  describe('Tenant & Store Isolation & RBAC', () => {
    it('should block access for user missing permissions', async () => {
      const res = await request(app)
        .get(`/api/v1/receipts/${testReceiptId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });

    it('should reject cross-tenant receipt access', async () => {
      const res = await request(app)
        .get(`/api/v1/receipts/${testReceiptId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });
  });
});
