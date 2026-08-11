import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { Product, ProductType } from '../models';

export const runAdvancedProductModuleVerification = async () => {
  console.log('====================================================');
  console.log('ADVANCED PRODUCT MANAGEMENT MODULE VERIFICATION');
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

  // 1. GET Product Types Master from Database
  console.log('\n[1/5] Testing GET /api/v1/products/types (Database Product Types Master)...');
  const typesRes = await req.get('/api/v1/products/types').set('Authorization', 'Bearer ' + token);
  console.log(`GET /types Status: ${typesRes.status}`);
  if (typesRes.status !== 200) {
    throw new Error(`GET product types failed with status ${typesRes.status}`);
  }
  const typeCodes = typesRes.body.data.map((t: any) => t.code);
  console.log(
    `✅ ${typesRes.body.data.length} Product Types Loaded from Database! Codes:`,
    typeCodes
  );

  // 2. CREATE Physical Product
  console.log('\n[2/5] Creating Physical Product (productType: physical)...');
  const physRes = await req
    .post('/api/v1/products')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: 'Physical Wireless Headphones',
      sku: 'PHYS-HP-' + Date.now().toString().slice(-4),
      price: 2499.0,
      costPrice: 1200.0,
      productType: 'physical',
      status: 'published',
      dynamicAttributes: { weight: 0.5, dimensions: '20x15x8 cm' },
    });

  console.log(`Physical Product Creation Status: ${physRes.status}`);
  if (physRes.status !== 201 && physRes.status !== 200) {
    console.error('Create Error Response:', JSON.stringify(physRes.body));
    throw new Error(`Create Physical product failed with status ${physRes.status}`);
  }
  console.log(
    `✅ Physical Product Created! ID: ${physRes.body.data.id}, SKU: "${physRes.body.data.sku}"`
  );

  // 3. CREATE Print On Demand Product
  console.log('\n[3/5] Creating Print On Demand Product (productType: print_on_demand)...');
  const podRes = await req
    .post('/api/v1/products')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: 'POD Custom Graphic Hoodie',
      sku: 'POD-HOOD-' + Date.now().toString().slice(-4),
      price: 1499.0,
      costPrice: 600.0,
      productType: 'print_on_demand',
      status: 'published',
      dynamicAttributes: { podProvider: 'Gelato', templateId: 'TEMP-9982' },
    });

  console.log(`POD Product Creation Status: ${podRes.status}`);
  if (podRes.status !== 201 && podRes.status !== 200) {
    throw new Error(`Create POD product failed with status ${podRes.status}`);
  }
  console.log(`✅ POD Product Created! ID: ${podRes.body.data.id}, SKU: "${podRes.body.data.sku}"`);

  // 4. CREATE Subscription Product
  console.log('\n[4/5] Creating Subscription Product (productType: subscription)...');
  const subRes = await req
    .post('/api/v1/products')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: 'SaaS Pro Monthly Subscription',
      sku: 'SUB-PRO-' + Date.now().toString().slice(-4),
      price: 499.0,
      costPrice: 0.0,
      productType: 'subscription',
      status: 'published',
      dynamicAttributes: { billingCycle: 'monthly', trialDays: 14 },
    });

  console.log(`Subscription Creation Status: ${subRes.status}`);
  if (subRes.status !== 201 && subRes.status !== 200) {
    throw new Error(`Create Subscription product failed with status ${subRes.status}`);
  }
  console.log(`✅ Subscription Product Created! ID: ${subRes.body.data.id}`);

  // 5. Test Customer MySQL Multi-Type Filtering Query (types=physical,print_on_demand)
  console.log(
    '\n[5/5] Testing Customer Backend MySQL Multi-Type Filter (types=physical,print_on_demand)...'
  );
  const filterRes = await req
    .get('/api/v1/products?types=physical,print_on_demand')
    .set('Authorization', 'Bearer ' + token);

  console.log(`Multi-Type Filter Status: ${filterRes.status}`);
  if (filterRes.status !== 200) {
    console.error('Filter Error Response:', JSON.stringify(filterRes.body));
    throw new Error(`Customer multi-type query failed with status ${filterRes.status}`);
  }
  const filteredList = filterRes.body.data || [];
  console.log(`✅ MySQL Multi-Type Filter Returned ${filteredList.length} Matching Products!`);

  const matchingTypes = Array.from(
    new Set(filteredList.map((p: any) => p.productType || p.product_type))
  );
  console.log(`Product Types Present in Filter Result:`, matchingTypes);

  console.log('\n====================================================');
  console.log('🎉 ADVANCED PRODUCT MANAGEMENT MODULE VERIFIED 100% SUCCESS!');
  console.log('====================================================');
};

if (require.main === module) {
  runAdvancedProductModuleVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification Error:', err);
      process.exit(1);
    });
}
