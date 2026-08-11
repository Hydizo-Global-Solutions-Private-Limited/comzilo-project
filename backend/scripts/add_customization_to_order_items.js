const mysql = require('mysql2/promise');

async function addCustomizationColumn() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== ADDING CUSTOMIZATION COLUMN TO ORDER_ITEMS ===');
  try {
    await conn.query('ALTER TABLE order_items ADD COLUMN customization JSON NULL AFTER total');
    console.log('Successfully added customization column to order_items table!');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('customization column already exists on order_items table.');
    } else {
      console.error(err);
    }
  }

  await conn.end();
}

addCustomizationColumn().catch(console.error);
