const mysql = require('mysql2/promise');

async function debugOrdersFetch() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== ALL ORDERS IN DB ===');
  const [allOrders] = await conn.query('SELECT id, tenant_id, store_id, order_number, total_amount, status FROM orders');
  console.log(allOrders);

  console.log('\n=== STORE ORDERS FOR STORE_ID = 1 & TENANT_ID = 3 ===');
  const [tenantOrders] = await conn.query('SELECT id, tenant_id, store_id, order_number, total_amount, status FROM orders WHERE tenant_id = 3 OR store_id = 3');
  console.log(tenantOrders);

  await conn.end();
}

debugOrdersFetch().catch(console.error);
