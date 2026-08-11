const mysql = require('mysql2/promise');

async function inspectStoreIds() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== ORDERS STORE_IDs FOR TENANT 3 ===');
  const [orders] = await conn.query('SELECT id, order_number, tenant_id, store_id FROM orders WHERE tenant_id = 3');
  console.log(orders);

  console.log('=== INVOICES STORE_IDs FOR TENANT 3 ===');
  const [invoices] = await conn.query('SELECT id, invoice_number, tenant_id, store_id FROM invoices WHERE tenant_id = 3');
  console.log(invoices);

  console.log('=== PAYMENTS STORE_IDs FOR TENANT 3 ===');
  const [payments] = await conn.query('SELECT id, payment_number, tenant_id, store_id FROM payments WHERE tenant_id = 3');
  console.log(payments);

  console.log('=== CUSTOMERS STORE_IDs FOR TENANT 3 ===');
  const [customers] = await conn.query('SELECT id, email, tenant_id, store_id FROM customers WHERE tenant_id = 3');
  console.log(customers);

  await conn.end();
}

inspectStoreIds().catch(console.error);
