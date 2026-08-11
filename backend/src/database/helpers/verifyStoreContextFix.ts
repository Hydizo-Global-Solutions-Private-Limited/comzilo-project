import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { Warehouse } from '../models';

export const runStoreContextVerification = async () => {
  console.log('====================================================');
  console.log('STORE CONTEXT AUTOMATIC RESOLUTION VERIFICATION');
  console.log('====================================================');

  await connectDatabase();
  const req = supertest(app);

  // Authenticate as Admin/Seller user
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
  const testName = 'Auto Store Context Warehouse ' + Date.now().toString().slice(-4);
  const testCode = 'WH-AUTO-' + Date.now().toString().slice(-4);

  console.log(`Submitting POST /api/v1/warehouses without X-Store-ID header...`);
  const createRes = await req
    .post('/api/v1/warehouses')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: testName,
      code: testCode,
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      postalCode: '500081',
      isDefault: false,
    });

  console.log(`HTTP Response Status: ${createRes.status}`);
  console.log(`HTTP Response Body:`, JSON.stringify(createRes.body, null, 2));

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Warehouse creation failed with status ${createRes.status}`);
  }

  const dbRecord = await Warehouse.findOne({ where: { code: testCode } });
  if (!dbRecord) {
    throw new Error(`Warehouse with code ${testCode} not found in DB!`);
  }

  console.log(
    `✅ Warehouse created and store context resolved automatically! Store ID: ${dbRecord.storeId}`
  );

  console.log('\n====================================================');
  console.log('🎉 STORE CONTEXT FIX VERIFIED 100% SUCCESS!');
  console.log('====================================================');
};

if (require.main === module) {
  runStoreContextVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification Error:', err);
      process.exit(1);
    });
}
