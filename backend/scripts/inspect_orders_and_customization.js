const mysql = require('mysql2/promise');

async function inspectOrders() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== LATEST ORDERS IN DATABASE ===');
  const [orders] = await conn.query('SELECT * FROM orders ORDER BY id DESC LIMIT 5');
  console.log('Orders:', orders);

  if (orders.length > 0) {
    const latestOrderId = orders[0].id;
    console.log(`\n=== ORDER ITEMS FOR ORDER #${latestOrderId} ===`);
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [latestOrderId]);
    console.log('Order Items:', JSON.stringify(items, null, 2));
  }

  await conn.end();
}

inspectOrders().catch(console.error);
