const jwt = require('jsonwebtoken');

async function testStoreHeaderIssue() {
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-comzilo-marketplace-2026';
  const token = jwt.sign(
    { userId: 5, tenantId: 3, role: 'seller' },
    secret,
    { expiresIn: '1d' }
  );

  console.log('Testing GET /api/v1/invoices with x-store-id = 1...');
  const res1 = await fetch('http://localhost:5000/api/v1/invoices', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': '3',
      'x-store-id': '1'
    }
  });
  const json1 = await res1.json();
  console.log('Response with x-store-id = 1:', JSON.stringify(json1, null, 2));
}

testStoreHeaderIssue().catch(console.error);
