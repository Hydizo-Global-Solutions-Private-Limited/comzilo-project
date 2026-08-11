const mysql = require('mysql2/promise');

async function listTables() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  const [tbls] = await conn.query('SHOW TABLES');
  console.log('Tables in comzilo_db:', tbls.map(t => Object.values(t)[0]));

  const [oCols] = await conn.query('DESCRIBE order_items');
  console.log('\norder_items columns:', oCols);

  await conn.end();
}

listTables().catch(console.error);
