const mysql = require('mysql2/promise');

async function inspectSalesData() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== CUSTOMERS ===');
  const [custs] = await conn.query('SELECT id, tenant_id, first_name, last_name, email FROM customers');
  console.log(custs);

  console.log('=== INVOICES ===');
  const [invs] = await conn.query('SELECT id, tenant_id, invoice_number, total_amount FROM invoices');
  console.log(invs);

  console.log('=== PAYMENTS ===');
  const [pays] = await conn.query('SELECT id, tenant_id, payment_number, amount FROM payments');
  console.log(pays);

  await conn.end();
}

inspectSalesData().catch(console.error);
