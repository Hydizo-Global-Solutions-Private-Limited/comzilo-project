const mysql = require('mysql2/promise');

async function inspectSellerUserAndTenant() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== USERS TABLE ===');
  const [users] = await conn.query('SELECT id, email, tenant_id FROM users');
  console.log(users);

  console.log('\n=== TENANTS TABLE ===');
  const [tenants] = await conn.query('SELECT id, name, domain, status FROM tenants');
  console.log(tenants);

  console.log('\n=== CUSTOMERS TABLE (tenant_id counts) ===');
  const [custCounts] = await conn.query('SELECT tenant_id, COUNT(*) as count FROM customers GROUP BY tenant_id');
  console.log(custCounts);

  console.log('\n=== ORDERS TABLE (tenant_id counts) ===');
  const [orderCounts] = await conn.query('SELECT tenant_id, COUNT(*) as count FROM orders GROUP BY tenant_id');
  console.log(orderCounts);

  console.log('\n=== INVOICES TABLE (tenant_id counts) ===');
  const [invCounts] = await conn.query('SELECT tenant_id, COUNT(*) as count FROM invoices GROUP BY tenant_id');
  console.log(invCounts);

  console.log('\n=== PAYMENTS TABLE (tenant_id counts) ===');
  const [payCounts] = await conn.query('SELECT tenant_id, COUNT(*) as count FROM payments GROUP BY tenant_id');
  console.log(payCounts);

  await conn.end();
}

inspectSellerUserAndTenant().catch(console.error);
