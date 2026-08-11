const mysql = require('mysql2/promise');

async function getTransparentTshirtUrl() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  const [rows] = await conn.query('SELECT name, object_key, public_url FROM pod_assets WHERE asset_type="base_mockup"');
  console.log('Base Mockups:', rows);

  await conn.end();
}

getTransparentTshirtUrl().catch(console.error);
