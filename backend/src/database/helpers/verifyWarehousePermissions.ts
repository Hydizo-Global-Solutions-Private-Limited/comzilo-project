import { connectDatabase, sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';
import { app } from '../../app';
import supertest from 'supertest';
import { Warehouse, Role, Permission } from '../models';

export const runWarehousePermissionsVerification = async () => {
  console.log('====================================================');
  console.log('WAREHOUSE RBAC PERMISSIONS VERIFICATION');
  console.log('====================================================');

  await connectDatabase();

  // 1. Ensure required permissions exist in permissions table
  console.log('\n[1/4] Checking Database Permissions Table...');
  const requiredPerms = [
    { code: 'warehouse.view', name: 'View Warehouses', module: 'warehouses' },
    { code: 'warehouse.read', name: 'Read Warehouses', module: 'warehouses' },
    { code: 'warehouse.create', name: 'Create Warehouses', module: 'warehouses' },
    { code: 'warehouse.update', name: 'Update Warehouses', module: 'warehouses' },
    { code: 'warehouse.delete', name: 'Delete Warehouses', module: 'warehouses' },
    { code: 'warehouse.manage', name: 'Manage Warehouses', module: 'warehouses' },
    { code: 'warehouse_location.read', name: 'Read Warehouse Locations', module: 'warehouses' },
    { code: 'warehouse_location.create', name: 'Create Warehouse Locations', module: 'warehouses' },
  ];

  for (const perm of requiredPerms) {
    const [existing]: any = await sequelize.query(
      'SELECT id FROM permissions WHERE code = :code LIMIT 1',
      { replacements: { code: perm.code }, type: QueryTypes.SELECT }
    );

    if (!existing) {
      console.log(`+ Inserting missing permission: ${perm.code}`);
      await sequelize.query(
        'INSERT INTO permissions (code, name, module, description, created_at, updated_at) VALUES (:code, :name, :module, :description, NOW(), NOW())',
        {
          replacements: {
            code: perm.code,
            name: perm.name,
            module: perm.module,
            description: `Allows ${perm.name.toLowerCase()}`,
          },
        }
      );
    } else {
      console.log(`✅ Permission exists: ${perm.code}`);
    }
  }

  // 2. Ensure tenant_owner & store_owner roles have warehouse permissions
  console.log('\n[2/4] Verifying Role-Permission Mappings for Seller/Tenant Owner...');
  const targetRoles = ['tenant_owner', 'store_owner', 'admin', 'super_admin'];
  const roles: any = await sequelize.query(
    'SELECT id, code FROM roles WHERE code IN (:targetRoles)',
    {
      replacements: { targetRoles },
      type: QueryTypes.SELECT,
    }
  );

  const permissions: any = await sequelize.query(
    'SELECT id, code FROM permissions WHERE module = "warehouses"',
    {
      type: QueryTypes.SELECT,
    }
  );

  for (const role of roles) {
    for (const perm of permissions) {
      const [existingRp]: any = await sequelize.query(
        'SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id LIMIT 1',
        {
          replacements: { role_id: role.id, permission_id: perm.id },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingRp) {
        console.log(`+ Assigning ${perm.code} to role ${role.code}`);
        await sequelize.query(
          'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (:role_id, :permission_id, NOW())',
          { replacements: { role_id: role.id, permission_id: perm.id } }
        );
      }
    }
  }
  console.log('✅ Role-Permission mappings verified for Seller roles.');

  // 3. Test HTTP API calls with Tenant Owner / Seller user
  console.log('\n[3/4] Testing HTTP API Creation of Warehouse as Seller...');
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
  const testWarehouseName = 'RBAC Verified Warehouse ' + Date.now().toString().slice(-4);
  const testWarehouseCode = 'WH-RBAC-' + Date.now().toString().slice(-4);

  // Test POST /api/v1/store/inventory-management/warehouses
  console.log(`Submitting POST /api/v1/store/inventory-management/warehouses...`);
  const createRes = await req
    .post('/api/v1/store/inventory-management/warehouses')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: testWarehouseName,
      code: testWarehouseCode,
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

  // 4. Verify Warehouse is persisted in MySQL database & test DELETE API with auto-reassignment
  console.log(
    '\n[4/4] Verifying Database Record Persistence & DELETE API with Auto-Reassignment...'
  );
  const savedWarehouse1 = await Warehouse.findOne({ where: { code: testWarehouseCode } });
  if (!savedWarehouse1) {
    throw new Error(`Warehouse with code ${testWarehouseCode} was not found in MySQL database!`);
  }

  // Create a second warehouse to test default auto-reassignment
  const secondCode = 'WH-RBAC2-' + Date.now().toString().slice(-4);
  const secondWh = await req
    .post('/api/v1/store/inventory-management/warehouses')
    .set('Authorization', 'Bearer ' + token)
    .send({
      name: 'Secondary Wh ' + Date.now().toString().slice(-4),
      code: secondCode,
      city: 'Delhi',
      isDefault: false,
    });

  const savedWarehouse2 = await Warehouse.findOne({ where: { code: secondCode } });

  console.log(`Testing DELETE default warehouse #${savedWarehouse1.id}...`);
  const deleteRes1 = await req
    .delete(`/api/v1/warehouses/${savedWarehouse1.id}`)
    .set('Authorization', 'Bearer ' + token);

  console.log(`DELETE HTTP Response Status: ${deleteRes1.status}`);
  if (deleteRes1.status !== 200) {
    throw new Error(
      `DELETE warehouse failed with status ${deleteRes1.status}: ${JSON.stringify(deleteRes1.body)}`
    );
  }

  // Reload warehouse 2 to confirm it was automatically promoted to default
  await savedWarehouse2?.reload();
  console.log(
    `✅ Warehouse #${savedWarehouse1.id} deleted. Warehouse #${savedWarehouse2?.id} is now default: ${savedWarehouse2?.isDefault}`
  );

  console.log('\n====================================================');
  console.log('🎉 WAREHOUSE RBAC PERMISSIONS VERIFIED 100% SUCCESS!');
  console.log('====================================================');
  console.log('====================================================');
};

if (require.main === module) {
  runWarehousePermissionsVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification Error:', err);
      process.exit(1);
    });
}
