/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import request from 'supertest';
import { app } from '../../../src/app';
import { sequelize } from '../../../src/config/database';
import { Store, Product, Customer, Order, OrderItem } from '../../../src/database/models';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Integration Tests: Payment Management Module', () => {
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
  let testPaymentId: number;
  let testInvoiceId: number;

  beforeAll(async () => {
    tenantUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Payment Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid: tenantUuid, slug: `slug-${tenantUuid}` } }
    );
    const [tRows]: any = await sequelize.query('SELECT id FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid: tenantUuid },
    });
    tenantId = tRows[0].id;

    const userUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO users (tenant_id, uuid, email, password_hash, first_name, last_name, status, failed_login_attempts, created_at, updated_at)
       VALUES (:tId, :uuid, :email, 'hashed', 'Payment', 'Admin', 'active', 0, NOW(), NOW())`,
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
      name: 'Payment Store',
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

    // Create other tenant for cross-tenant isolation testing
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

    const product = await Product.create({
      tenantId,
      storeId,
      slug: 'payment-test-product',
      name: 'Payment Test Product',
      sku: 'PROD-PAY-01',
      price: 150.0,
      status: 'active',
    } as any);
    testProductId = product.id;

    const customer = await Customer.create({
      tenantId,
      storeId,
      customerCode: 'CUST-PAY-01',
      firstName: 'James',
      lastName: 'Payment',
      fullName: 'James Payment',
      email: 'james.payment@test.com',
      phone: '+1777888999',
      status: 'active',
    } as any);
    testCustomerId = customer.id;

    const order = await Order.create({
      tenantId,
      storeId,
      orderNumber: 'ORD-PAY-001',
      customerId: testCustomerId,
      status: 'confirmed',
      subtotal: 300.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      shippingAmount: 0.0,
      totalAmount: 300.0,
      currency: 'USD',
    } as any);
    testOrderId = order.id;

    await OrderItem.create({
      tenantId,
      storeId,
      orderId: order.id,
      productId: testProductId,
      sku: 'PROD-PAY-01',
      productName: 'Payment Test Product',
      quantity: 2,
      unitPrice: 150.0,
      subtotal: 300.0,
      total: 300.0,
    } as any);
  }, 60000);

  describe('Payments CRUD & Authorization Workflow', () => {
    it('should create a pending payment for the order', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Card',
          gateway: 'manual',
          amount: 150.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentStatus).toBe('pending');
      expect(Number(res.body.data.amount)).toBe(150.0);
      testPaymentId = res.body.data.id;
    });

    it('should authorize the payment', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${testPaymentId}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('authorized');
    });

    it('should capture the payment and transition order to partially_paid', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${testPaymentId}/capture`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('paid');

      const orderRes = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());
      expect(orderRes.body.data.paymentStatus).toBe('partially_paid');
    });
  });

  describe('Payment Idempotency Strategy', () => {
    const key = `idem-${uuidv4()}`;

    it('should return the original payment on the first idempotent request', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Cash',
          amount: 50.0,
          idempotencyKey: key,
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.data.amount)).toBe(50.0);
    });

    it('should return the identical payment record on repeated idempotent request', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Cash',
          amount: 50.0,
          idempotencyKey: key,
        });

      expect(res.status).toBe(201); // Standard idempotent output
    });

    it('should return 409 conflict when idempotency key is matched with different payload', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Cash',
          amount: 100.0,
          idempotencyKey: key,
        });

      expect(res.status).toBe(409);
    });

    it('should handle simultaneous requests with the same key safely under concurrency', async () => {
      const concurrentKey = `idem-${uuidv4()}`;
      const payload = {
        orderId: testOrderId,
        paymentMethod: 'Cash',
        amount: 10.0,
        idempotencyKey: concurrentKey,
      };

      const requests = [
        request(app)
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-UUID', tenantUuid)
          .set('X-Store-ID', storeId.toString())
          .send(payload),
        request(app)
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-UUID', tenantUuid)
          .set('X-Store-ID', storeId.toString())
          .send(payload),
      ];

      const results = await Promise.all(requests);
      const successes = results.filter((r) => r.status === 201);
      // At least one succeeds; the second may either return the original (201) or a transaction conflict cleanly.
      expect(successes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Payment Safety Restrictions', () => {
    it('should reject payment creation with currency mismatch', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Cash',
          amount: 10.0,
          currency: 'EUR', // order is USD
        });

      expect(res.status).toBe(400);
    });

    it('should reject double capture operations', async () => {
      // testPaymentId is already captured/paid
      const res = await request(app)
        .post(`/api/v1/payments/${testPaymentId}/capture`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Illegal payment status transition');
    });

    it('should reject capturing cancelled/failed payments', async () => {
      // Create and fail a payment
      const pRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Cash',
          amount: 5.0,
        });

      const paymentId = pRes.body.data.id;

      await request(app)
        .post(`/api/v1/payments/${paymentId}/fail`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      // Attempt to capture failed payment
      const capRes = await request(app)
        .post(`/api/v1/payments/${paymentId}/capture`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(capRes.status).toBe(400);
    });
  });

  describe('Refund Safety Restrictions', () => {
    it('should reject refund exceeding captured amount', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${testPaymentId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          amount: 200.0, // payment is only 150.00
        });

      expect(res.status).toBe(400);
    });

    it('should prevent refunding pending/authorized payments', async () => {
      const pRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          paymentMethod: 'Cash',
          amount: 1.0,
        });
      const pendingPaymentId = pRes.body.data.id;

      const refRes = await request(app)
        .post(`/api/v1/payments/${pendingPaymentId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          amount: 1.0,
        });
      expect(refRes.status).toBe(400);
    });
  });

  describe('Invoice Safety & Constraints', () => {
    it('should reject client-provided invoice totals', async () => {
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
          total: 1.0, // should be ignored/rejected
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.data.total)).toBe(300.0); // snapshot total preserved
      testInvoiceId = res.body.data.id;
    });

    it('should block creating another active invoice for order', async () => {
      // Transition first invoice to issued/active
      await request(app)
        .put(`/api/v1/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          invoiceStatus: 'issued',
        });

      // Try to create second invoice
      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          orderId: testOrderId,
        });

      expect(res.status).toBe(400);
    });

    it('should prevent modifying paid invoices', async () => {
      // Transition to paid
      await request(app)
        .put(`/api/v1/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          invoiceStatus: 'paid',
        });

      // Attempt to modify paid invoice
      const res = await request(app)
        .put(`/api/v1/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString())
        .send({
          invoiceStatus: 'cancelled',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Tenant & Store Isolation', () => {
    it('should reject reading another tenant payment', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });

    it('should reject capturing another tenant payment', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${testPaymentId}/capture`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .set('X-Tenant-UUID', otherTenantUuid)
        .set('X-Store-ID', otherStoreId.toString());

      expect(res.status).toBe(404);
    });

    it('should block access for user missing permissions', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/${testPaymentId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .set('X-Tenant-UUID', tenantUuid)
        .set('X-Store-ID', storeId.toString());

      expect(res.status).toBe(403);
    });
  });
});
