const mysql = require('mysql2/promise');

async function inspectOrder3() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== LATEST ORDERS ===');
  const [orders] = await conn.query('SELECT id, order_number, total_amount, status, created_at FROM orders ORDER BY id DESC LIMIT 5');
  console.log('Orders:', orders);

  for (const o of orders) {
    console.log(`\n=== ORDER ITEMS FOR ORDER #${o.id} (${o.order_number}) ===`);
    const [items] = await conn.query('SELECT id, product_name, sku, total, customization FROM order_items WHERE order_id = ?', [o.id]);
    console.log('Items:', JSON.stringify(items, null, 2));
  }

  await conn.end();
}

inspectOrder3().catch(console.error);
