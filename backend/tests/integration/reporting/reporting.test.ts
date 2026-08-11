/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import {
  Store,
  Product,
  Customer,
  Order,
  OrderItem,
  InventoryBalance,
} from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Reporting & Analytics Module', () => {
  let tenantId: number;
  let storeId: number;
  let adminToken: string;
  let readerToken: string;
  let tenantUuid: string;

  let otherTenantId: number;
  let otherStoreId: number;
  let otherAdminToken: string;
  let otherTenantUuid: string;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Reporting Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Reporting', 'Admin', 'active', 0, NOW(), NOW())`,
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
      name: 'Reporting Store',
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

    // Other Tenant Setup for Isolation
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

    // Seed Real Data for Reporting Tests
    const customer = await Customer.create({
      tenantId,
      storeId,
      customerCode: 'CUST-REP-01',
      firstName: 'Analytics',
      lastName: 'Customer',
      fullName: 'Analytics Customer',
      email: `analytics-${tenantUuid}@test.com`,
      phone: '+15550009999',
      status: 'active',
    } as any);

    const product = await Product.create({
      tenantId,
      storeId,
      slug: 'rep-test-product',
      name: 'Analytics Test Product',
      sku: 'PROD-REP-01',
      price: 150.0,
      status: 'active',
    } as any);

    // Create Warehouse
    const [wId]: any = await sequelize.query(
      `INSERT INTO warehouses (tenant_id, store_id, uuid, name, code, status, created_at, updated_at)
       VALUES (:tId, :sId, :uuid, 'Main Warehouse', 'WH-MAIN', 'active', NOW(), NOW())`,
      { replacements: { tId: tenantId, sId: storeId, uuid: uuidv4() } }
    );

    const [wlId]: any = await sequelize.query(
      `INSERT INTO warehouse_locations (tenant_id, store_id, warehouse_id, uuid, name, code, status, created_at, updated_at)
       VALUES (:tId, :sId, :wId, :uuid, 'Main Location', 'LOC-MAIN', 'active', NOW(), NOW())`,
      { replacements: { tId: tenantId, sId: storeId, wId, uuid: uuidv4() } }
    );

    await InventoryBalance.create({
      tenantId,
      storeId,
      productId: product.id,
      warehouseId: wId,
      warehouseLocationId: wlId,
      quantityOnHand: 5,
      quantityReserved: 0,
      quantityAvailable: 5,
    } as any);

    const order = await Order.create({
      tenantId,
      storeId,
      orderNumber: `ORD-REP-01`,
      customerId: customer.id,
      status: 'completed',
      subtotal: 300.0,
      discountAmount: 0,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 300.0,
      currency: 'USD',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
    } as any);

    await OrderItem.create({
      tenantId,
      storeId,
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: 2,
      unitPrice: 150.0,
      subtotal: 300.0,
      total: 300.0,
    } as any);

    await sequelize.query(
      `INSERT INTO payments (tenant_id, store_id, order_id, uuid, payment_number, payment_method, payment_status, amount, currency, created_at, updated_at)
       VALUES (:tId, :sId, :oId, :uuid, 'PAY-REP-01', 'Card', 'paid', 300.00, 'USD', NOW(), NOW())`,
      { replacements: { tId: tenantId, sId: storeId, oId: order.id, uuid: uuidv4() } }
    );
  }, 60000);

  describe('Executive Dashboard API', () => {
    it('should retrieve real executive dashboard summary', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(Number(res.body.data.totalRevenue)).toBe(300.0);
      expect(Number(res.body.data.totalOrders)).toBe(1);
      expect(Number(res.body.data.lowStockCount)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sales Reports API', () => {
    it('should retrieve sales report grouped by period', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales?period=daily')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalGrossSales).toBe(300.0);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Product Reports API', () => {
    it('should retrieve best selling products report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/products?sortBy=revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.rows[0].productName).toBe('Analytics Test Product');
    });
  });

  describe('Inventory Reports API', () => {
    it('should retrieve inventory report with stock valuation', async () => {
      const res = await request(app)
        .get('/api/v1/reports/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(Number(res.body.data.summary.totalValuation)).toBe(750.0); // 5 * 150 = 750
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Customer Reports API', () => {
    it('should retrieve customer spending report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.topCustomers.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.topCustomers[0].customerName).toBe('Analytics Customer');
    });
  });

  describe('Payment & POS Reports API', () => {
    it('should retrieve payment breakdown report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.methodBreakdown.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve POS summary report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/pos')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.registerSales).toBeDefined();
    });
  });

  describe('CSV Export API', () => {
    it('should export sales report as CSV', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/csv?reportType=sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('periodGroup');
    });
  });

  describe('Isolation & RBAC Security', () => {
    it('should block access for user missing reporting permissions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });

    it('should enforce tenant isolation in reporting analytics', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(200);
      expect(Number(res.body.data.totalRevenue)).toBe(0.0); // other tenant has 0 sales
    });
  });
});
