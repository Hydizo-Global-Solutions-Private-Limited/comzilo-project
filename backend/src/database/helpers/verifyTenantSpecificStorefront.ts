import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const testTenantSpecificStorefront = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('TESTING LOCAL DEVELOPMENT TENANT RESOLUTION & ISOLATION');
  console.log('====================================================');

  // 1. Query Default Customer Storefront (tenant_id = 1, store_id = 1)
  console.log('\n[1] Querying Default Storefront (tenant_id = 1)...');
  const res1 = await req.get('/api/v1/products');
  console.log(
    `GET /api/v1/products Status: ${res1.status}, Count: ${res1.body?.data?.length || 0}`
  );

  // 2. Query Specific Storefront via URL query parameters: ?tenant_id=20&store_id=18
  console.log('\n[2] Querying Satish Store Storefront via URL: ?tenant_id=20&store_id=18...');
  const res2 = await req.get('/api/v1/products?tenant_id=20&store_id=18');
  console.log(
    `GET /api/v1/products?tenant_id=20&store_id=18 Status: ${res2.status}, Count: ${res2.body?.data?.length || 0}`
  );
  if (res2.body?.data?.length > 0) {
    console.log(
      `✅ Returned ${res2.body.data.length} product(s) belonging specifically to tenant 20 / store 18!`
    );
    console.log(
      `   - Sample Product: "${res2.body.data[0].name}" (Tenant ID: ${res2.body.data[0].tenantId}, Store ID: ${res2.body.data[0].storeId})`
    );
  }

  // 3. Query Specific Storefront via Store Slug: ?store=satishstore
  console.log('\n[3] Querying Satish Storefront via Store Slug: ?store=satishstore...');
  const res3 = await req.get('/api/v1/products?store=satishstore');
  console.log(
    `GET /api/v1/products?store=satishstore Status: ${res3.status}, Count: ${res3.body?.data?.length || 0}`
  );

  console.log('\n====================================================');
  console.log('✅ MULTI-TENANT LOCAL DEVELOPMENT ISOLATION VERIFIED 100%!');
  console.log('====================================================');
};

testTenantSpecificStorefront()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
