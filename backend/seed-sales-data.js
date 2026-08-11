const { sequelize } = require('./dist/config/database');
const crypto = require('crypto');

async function seedSalesData() {
  try {
    console.log('[Seed Sales Data] Connecting to MySQL Database...');
    await sequelize.authenticate();

    // 1. Check or Create Customer
    const [customers] = await sequelize.query(`
      SELECT id FROM customers WHERE tenant_id = 1 LIMIT 5;
    `);

    let customerId = customers?.[0]?.id;
    if (!customerId) {
      const [res] = await sequelize.query(`
        INSERT INTO customers (uuid, tenant_id, store_id, customer_code, first_name, last_name, email, phone, status, customer_type, created_at, updated_at)
        VALUES ('${crypto.randomUUID()}', 1, 1, 'CUST-2026-001', 'Hemanth', 'Gannamani', 'hemanth@comzilo.com', '+917382466233', 'active', 'individual', NOW(), NOW());
      `);
      customerId = res;
    }

    // 2. Check or Create Product
    const [products] = await sequelize.query(`
      SELECT id FROM products WHERE tenant_id = 1 LIMIT 5;
    `);
    let productId = products?.[0]?.id;
    if (!productId) {
      const [resProd] = await sequelize.query(`
        INSERT INTO products (tenant_id, store_id, name, slug, sku, price, status, created_at, updated_at)
        VALUES (1, 1, 'Wireless Noise-Cancelling Headphones', 'wireless-headphones', 'SKU-HEADPHONES-01', 1499.00, 'active', NOW(), NOW());
      `);
      productId = resProd;
    }

    // 3. Create Real Sales Orders
    console.log('[Seed Sales Data] Seeding Sales Orders...');
    const orderNumbers = ['ORD-2026-1092', 'ORD-2026-1093', 'ORD-2026-1094', 'ORD-2026-1095'];
    const orderIds = [];

    for (let i = 0; i < orderNumbers.length; i++) {
      const num = orderNumbers[i];
      const [existing] = await sequelize.query(`SELECT id FROM orders WHERE order_number = '${num}' AND tenant_id = 1;`);
      if (existing && existing.length > 0) {
        orderIds.push(existing[0].id);
      } else {
        const [res] = await sequelize.query(`
          INSERT INTO orders (
            uuid, tenant_id, store_id, order_number, customer_id, status, payment_status, fulfillment_status,
            subtotal, discount_amount, tax_amount, shipping_amount, total_amount, currency, notes, created_at, updated_at
          ) VALUES (
            '${crypto.randomUUID()}', 1, 1, '${num}', ${customerId}, '${i % 2 === 0 ? 'completed' : 'processing'}', '${i % 2 === 0 ? 'paid' : 'unpaid'}', 'fulfilled',
            1499.00, 0.00, 180.00, 50.00, 1729.00, 'INR', 'Customer portal order', DATE_SUB(NOW(), INTERVAL ${i} DAY), NOW()
          );
        `);
        const orderId = res;
        orderIds.push(orderId);

        // Seed Order Item
        await sequelize.query(`
          INSERT INTO order_items (
            uuid, tenant_id, store_id, order_id, product_id, sku, product_name, quantity, unit_price, discount, tax, subtotal, total, created_at, updated_at
          ) VALUES (
            '${crypto.randomUUID()}', 1, 1, ${orderId}, ${productId}, 'SKU-HEADPHONES-01', 'Wireless Noise-Cancelling Headphones', 1, 1499.00, 0.00, 180.00, 1499.00, 1729.00, NOW(), NOW()
          );
        `);
      }
    }

    // 4. Create Invoices
    console.log('[Seed Sales Data] Seeding Invoices...');
    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      const invNum = `INV-2026-00${i + 1}`;
      const [existingInv] = await sequelize.query(`SELECT id FROM invoices WHERE invoice_number = '${invNum}' AND tenant_id = 1;`);
      if (!existingInv || existingInv.length === 0) {
        await sequelize.query(`
          INSERT INTO invoices (
            uuid, tenant_id, store_id, order_id, invoice_number, invoice_status, subtotal, tax, discount, total, issued_at, due_date, created_at, updated_at
          ) VALUES (
            '${crypto.randomUUID()}', 1, 1, ${orderId}, '${invNum}', 'issued', 1499.00, 180.00, 0.00, 1729.00, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), NOW(), NOW()
          );
        `);
      }
    }

    // 5. Create Payments
    console.log('[Seed Sales Data] Seeding Payments...');
    for (let i = 0; i < 2; i++) {
      const orderId = orderIds[i];
      const payNum = `PAY-2026-00${i + 1}`;
      const [existingPay] = await sequelize.query(`SELECT id FROM payments WHERE order_id = ${orderId} AND tenant_id = 1;`);
      if (!existingPay || existingPay.length === 0) {
        await sequelize.query(`
          INSERT INTO payments (
            uuid, tenant_id, store_id, order_id, payment_number, payment_method, payment_status, amount, currency, transaction_reference, created_at, updated_at
          ) VALUES (
            '${crypto.randomUUID()}', 1, 1, ${orderId}, '${payNum}', '${i === 0 ? 'CREDIT_CARD' : 'UPI'}', 'completed', 1729.00, 'INR', 'TXN_${Date.now()}_00${i}', NOW(), NOW()
          );
        `);
      }
    }

    // 6. Create Refunds / Returns (RMA)
    console.log('[Seed Sales Data] Seeding Refunds & Returns (RMA)...');
    const [payments] = await sequelize.query(`SELECT id FROM payments WHERE tenant_id = 1 LIMIT 2;`);
    if (payments && payments.length > 0) {
      const payId = payments[0].id;
      const refNum = `REF-2026-001`;
      const [existingRef] = await sequelize.query(`SELECT id FROM refunds WHERE payment_id = ${payId} AND tenant_id = 1;`);
      if (!existingRef || existingRef.length === 0) {
        await sequelize.query(`
          INSERT INTO refunds (
            uuid, tenant_id, store_id, payment_id, refund_number, amount, reason, status, created_at, updated_at
          ) VALUES (
            '${crypto.randomUUID()}', 1, 1, ${payId}, '${refNum}', 1729.00, 'Customer requested return - wrong size ordered', 'completed', NOW(), NOW()
          );
        `);
      }
    }

    console.log('[Seed Sales Data] ✅ Real Sales Data Successfully Seeded!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Sales Data] Error:', err);
    process.exit(1);
  }
}

seedSalesData();
