const mysql = require('mysql2/promise');

async function populateSalesTenantData() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== ENSURING COMPLETE SALES DATA FOR SELLER TENANT 3 ===');

  // 1. Ensure customer for tenant 3 exists
  const [custRows] = await conn.query('SELECT id FROM customers WHERE tenant_id = 3');
  let customerId = custRows.length > 0 ? custRows[0].id : null;
  if (!customerId) {
    const [res] = await conn.query(
      'INSERT INTO customers (tenant_id, store_id, first_name, last_name, email, phone, status, created_at, updated_at) VALUES (3, 3, "Vikas", "Maddipati", "maddipativikas130@gmail.com", "9876543210", "active", NOW(), NOW())'
    );
    customerId = res.insertId;
  }

  // 2. Ensure Invoices exist for tenant 3 orders
  const [orderRows] = await conn.query('SELECT id, order_number, total_amount FROM orders WHERE tenant_id = 3');
  for (const ord of orderRows) {
    const [invCheck] = await conn.query('SELECT id FROM invoices WHERE order_id = ?', [ord.id]);
    if (invCheck.length === 0) {
      await conn.query(
        'INSERT INTO invoices (tenant_id, store_id, order_id, invoice_number, invoice_status, total, created_at, updated_at) VALUES (3, 3, ?, ?, "paid", ?, NOW(), NOW())',
        [ord.id, `INV-${ord.order_number}`, ord.total_amount]
      );
    }

    // 3. Ensure Payments exist for tenant 3 orders
    const [payCheck] = await conn.query('SELECT id FROM payments WHERE order_id = ?', [ord.id]);
    if (payCheck.length === 0) {
      await conn.query(
        'INSERT INTO payments (tenant_id, store_id, order_id, payment_number, amount, payment_method, payment_status, currency, gateway, created_at, updated_at) VALUES (3, 3, ?, ?, ?, "cod", "paid", "INR", "manual", NOW(), NOW())',
        [ord.id, `PAY-${ord.order_number}`, ord.total_amount]
      );
    }
  }

  // 4. Ensure Refunds exist for tenant 3
  const [refundCheck] = await conn.query('SELECT id FROM refunds WHERE tenant_id = 3');
  if (refundCheck.length === 0 && orderRows.length > 0) {
    const [payRow] = await conn.query('SELECT id FROM payments WHERE tenant_id = 3 LIMIT 1');
    if (payRow.length > 0) {
      await conn.query(
        'INSERT INTO refunds (tenant_id, store_id, payment_id, refund_number, amount, reason, status, created_at, updated_at) VALUES (3, 3, ?, "RFD-2026-000001", 50.00, "Customer requested item color exchange adjustment", "processed", NOW(), NOW())',
        [payRow[0].id]
      );
    }
  }

  console.log('SUCCESSFULLY POPULATED COMPLETE SALES DATA FOR SELLER TENANT 3!');

  await conn.end();
}

populateSalesTenantData().catch(console.error);
