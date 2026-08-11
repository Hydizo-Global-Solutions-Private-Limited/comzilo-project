/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import {
  Store,
  Product,
  Warehouse,
  WarehouseLocation,
  Customer,
} from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';
import { InventoryService } from '../../../src/services/inventory.service';

describe('Integration Tests: Order Management Module', () => {
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
  let testCustomerId: number;
  let testOrderId: number;

  beforeAll(async () => {
    // 1. Create main test tenant and user
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Order Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Order', 'Admin', 'active', 0, NOW(), NOW())`,
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
      name: 'Order Store',
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

    // 3. Create a test product
    const product = await Product.create({
      tenantId,
      storeId,
      slug: 'order-test-product',
      name: 'Order Test Product',
      sku: 'PROD-ORD-01',
      price: 150.0,
      status: 'active',
    } as any);
    testProductId = product.id;

    // 4. Create an active customer
    const customer = await Customer.create({
      tenantId,
      storeId,
      customerCode: 'CUST-ORD-001',
      firstName: 'James',
      lastName: 'Order',
      fullName: 'James Order',
      email: 'james.order@test.com',
      phone: '+1888999000',
      status: 'active',
    } as any);
    testCustomerId = customer.id;

    // 5. Create default warehouse & location + stock for reservation tests
    const warehouse = await Warehouse.create({
      tenantId,
      storeId,
      name: 'Order Warehouse',
      code: 'WH-ORD',
      isDefault: true,
      status: 'active',
      type: 'physical',
    } as any);

    const location = await WarehouseLocation.create({
      tenantId,
      storeId,
      warehouseId: warehouse.id,
      name: 'Aisle 1',
      code: 'A1',
      isDefault: true,
      status: 'active',
    } as any);

    // Mutate stock in to ensure enough stock is available for testing confirmed reservations
    const inventoryService = new InventoryService();
    await inventoryService.mutateStock({
      tenantId,
      storeId,
      warehouseId: warehouse.id,
      warehouseLocationId: location.id,
      productId: product.id,
      movementType: 'stock_in',
      direction: 'in',
      quantity: 100,
      referenceType: 'Initial_Stock',
      referenceId: '1',
      performedBy: userId,
    });
  }, 60000);

  describe('Orders CRUD API', () => {
    it('should create a new order in draft status', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          customerId: testCustomerId,
          discountAmount: 10.0,
          taxAmount: 5.0,
          shippingAmount: 12.0,
          notes: 'Deliver before 5 PM',
          items: [
            {
              productId: testProductId,
              quantity: 2,
              discount: 5.0,
              tax: 2.5,
            },
          ],
        });

      if (res.status !== 201) console.log('ORDER CREATE RES BODY:', JSON.stringify(res.body));
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.orderNumber).toBeDefined();
      expect(Number(res.body.data.subtotal)).toBe(300.0); // 150 * 2
      expect(Number(res.body.data.totalAmount)).toBe(307.0); // 300 - 10 + 5 + 12
      testOrderId = res.body.data.id;
    });

    it('should retrieve the order details', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.items.length).toBe(1);
    });

    it('should list and search orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
    });

    it('should update a draft order', async () => {
      const res = await request(app)
        .put(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          notes: 'Deliver before 6 PM instead',
          discountAmount: 15.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Deliver before 6 PM instead');
      expect(Number(res.body.data.discountAmount)).toBe(15.0);
    });
  });

  describe('Order Workflow Transitions & Inventory Reservations', () => {
    it('should confirm the order and reserve stock', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${testOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
      expect(res.body.data.orderedAt).toBeDefined();
    });

    it('should reject updating order once it is confirmed', async () => {
      const res = await request(app)
        .put(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          notes: 'Hack confirmed order notes',
        });

      expect(res.status).toBe(400);
    });

    it('should cancel the order and release reservations', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${testOrderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should restore a cancelled order back to draft', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${testOrderId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('draft');
    });

    it('should complete confirmed order', async () => {
      // Re-confirm order
      await request(app)
        .post(`/api/v1/orders/${testOrderId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      // Complete order
      const res = await request(app)
        .post(`/api/v1/orders/${testOrderId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.paymentStatus).toBe('paid');
      expect(res.body.data.fulfillmentStatus).toBe('delivered');
    });
  });

  describe('Security & Boundaries', () => {
    it('should block access from different tenant context', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });

    it('should block access for user missing permissions', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });
  });
});
