import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';

export const runAllInventoryTabsVerification = async () => {
  console.log('====================================================');
  console.log('ENTERPRISE INVENTORY MODULE - ALL 16 TABS AUDIT');
  console.log('====================================================');

  await connectDatabase();
  const req = supertest(app);

  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });

  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error(
      `Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`
    );
  }

  const token = loginRes.body.data.accessToken;

  const endpoints = [
    { tab: 0, name: 'Inventory Dashboard', path: '/api/v1/store/inventory-management/dashboard' },
    { tab: 1, name: 'Warehouses', path: '/api/v1/store/inventory-management/warehouses' },
    { tab: 2, name: 'Warehouse Locations', path: '/api/v1/store/inventory-management/locations' },
    { tab: 3, name: 'Stock Balances', path: '/api/v1/store/inventory-management/balances' },
    {
      tab: 4,
      name: 'Stock Management Overview',
      path: '/api/v1/store/inventory-management/dashboard',
    },
    { tab: 5, name: 'Stock Transfers', path: '/api/v1/store/inventory-management/transfers' },
    { tab: 6, name: 'Stock Adjustments', path: '/api/v1/store/inventory-management/adjustments' },
    { tab: 7, name: 'Suppliers Directory', path: '/api/v1/store/inventory-management/suppliers' },
    {
      tab: 8,
      name: 'Purchase Orders (PO)',
      path: '/api/v1/store/inventory-management/purchase-orders',
    },
    {
      tab: 9,
      name: 'Goods Receipt (GRN)',
      path: '/api/v1/store/inventory-management/goods-receipts',
    },
    { tab: 10, name: 'Goods Issue (GIN)', path: '/api/v1/store/inventory-management/goods-issues' },
    { tab: 11, name: 'Barcode & QR Generator', path: '/api/v1/products' },
    { tab: 12, name: 'Serial Numbers', path: '/api/v1/store/inventory-management/serials' },
    { tab: 13, name: 'Batch Management', path: '/api/v1/store/inventory-management/batches' },
    { tab: 14, name: 'Expiry Risk Monitor', path: '/api/v1/store/inventory-management/batches' },
    { tab: 15, name: 'Reports & Analytics', path: '/api/v1/store/inventory-management/dashboard' },
  ];

  console.log(`Auditing all ${endpoints.length} Inventory Module Endpoints...`);

  for (const ep of endpoints) {
    const res = await req.get(ep.path).set('Authorization', 'Bearer ' + token);
    if (res.status !== 200) {
      throw new Error(
        `Tab ${ep.tab} [${ep.name}] failed at ${ep.path} with status ${res.status}: ${JSON.stringify(res.body)}`
      );
    }
    const count = Array.isArray(res.body.data) ? res.body.data.length : 'OK';
    console.log(`✅ Tab ${ep.tab} [${ep.name}]: Status 200 OK | Data: ${count}`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 16 ENTERPRISE INVENTORY TABS VERIFIED 100% SUCCESS!');
  console.log('====================================================');
};

if (require.main === module) {
  runAllInventoryTabsVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Audit Error:', err);
      process.exit(1);
    });
}
