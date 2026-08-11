const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function testSellerApis() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  const [users] = await conn.query('SELECT id, email, tenant_id FROM users WHERE email = "bordmart0@gmail.com" OR tenant_id = 3 LIMIT 1');
  console.log('Seller User:', users[0]);
  const user = users[0];

  await conn.end();

  // Create JWT Token for seller user
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-comzilo-marketplace-2026';
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenant_id, role: 'seller' },
    secret,
    { expiresIn: '1d' }
  );

  console.log('Generated JWT Token for Tenant 3:', token);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-tenant-id': '3'
  };

  const endpoints = ['/api/v1/customers', '/api/v1/orders', '/api/v1/invoices', '/api/v1/payments'];

  for (const ep of endpoints) {
    const res = await fetch(`http://localhost:5000${ep}`, { headers });
    const json = await res.json();
    console.log(`\n=== ENDPOINT: ${ep} (Status: ${res.status}) ===`);
    console.log('Response:', JSON.stringify(json, null, 2));
  }
}

testSellerApis().catch(console.error);
