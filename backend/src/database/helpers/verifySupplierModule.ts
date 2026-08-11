import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { Supplier } from '../models';

export const runSupplierModuleVerification = async () => {
  console.log('====================================================');
  console.log('SUPPLIER MODULE END-TO-END VERIFICATION');
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
  const supplierCode = 'SUP-VERIFY-' + Date.now().toString().slice(-4);
  const supplierName = 'Apex Global Raw Materials ' + Date.now().toString().slice(-4);

  // 1. GET Suppliers List
  console.log('\n[1/4] Testing GET /api/v1/store/inventory-management/suppliers...');
  const getRes = await req
    .get('/api/v1/store/inventory-management/suppliers')
    .set('Authorization', 'Bearer ' + token);

  console.log(`GET Status: ${getRes.status}`);
  if (getRes.status !== 200) {
    throw new Error(`GET suppliers failed with status ${getRes.status}`);
  }
  console.log(`Initial Suppliers Count: ${getRes.body.data?.length || 0}`);

  // 2. CREATE Supplier
  console.log('\n[2/4] Testing POST /api/v1/store/inventory-management/suppliers...');
  const createRes = await req
    .post('/api/v1/store/inventory-management/suppliers')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: supplierName,
      code: supplierCode,
      companyName: 'Apex Raw Materials Pvt Ltd',
      gstNumber: '36AAAAA0000A1Z5',
      email: 'contact@apexmaterials.com',
      phone: '+919876543210',
      address: 'Plot 45, Industrial Zone, Hyderabad',
    });

  console.log(`POST Status: ${createRes.status}`);
  console.log(`POST Response Body:`, JSON.stringify(createRes.body, null, 2));

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`CREATE supplier failed with status ${createRes.status}`);
  }

  const supplierId = createRes.body.data.id;
  console.log(`✅ Supplier Created Successfully! ID: ${supplierId}`);

  // 3. UPDATE Supplier
  console.log('\n[3/4] Testing PUT /api/v1/store/inventory-management/suppliers/:id...');
  const updatedName = supplierName + ' (Updated)';
  const updateRes = await req
    .put(`/api/v1/store/inventory-management/suppliers/${supplierId}`)
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: updatedName,
      companyName: 'Apex Materials International',
    });

  console.log(`PUT Status: ${updateRes.status}`);
  if (updateRes.status !== 200) {
    throw new Error(`UPDATE supplier failed with status ${updateRes.status}`);
  }
  console.log(`✅ Supplier Updated Successfully! Name: "${updateRes.body.data.name}"`);

  // 4. Verify Persistence in MySQL DB
  console.log('\n[4/4] Verifying Database Record Persistence...');
  const dbSupplier = await Supplier.findOne({ where: { id: supplierId } });
  if (!dbSupplier) {
    throw new Error(`Supplier ID ${supplierId} not found in MySQL database!`);
  }

  console.log(
    `✅ Supplier persisted in DB! ID: ${dbSupplier.id}, Name: "${dbSupplier.name}", Code: "${dbSupplier.code}"`
  );

  console.log('\n====================================================');
  console.log('🎉 SUPPLIER MODULE VERIFIED 100% SUCCESS!');
  console.log('====================================================');
};

if (require.main === module) {
  runSupplierModuleVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification Error:', err);
      process.exit(1);
    });
}
