import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { StockAdjustment, StockMovement, InventoryBalance } from '../models';

export const runStockAdjustmentModuleVerification = async () => {
  console.log('====================================================');
  console.log('STOCK ADJUSTMENTS MODULE END-TO-END VERIFICATION');
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

  // 1. GET Stock Adjustments List
  console.log('\n[1/5] Testing GET /api/v1/store/inventory-management/adjustments...');
  const getRes = await req
    .get('/api/v1/store/inventory-management/adjustments')
    .set('Authorization', 'Bearer ' + token);

  console.log(`GET Status: ${getRes.status}`);
  if (getRes.status !== 200) {
    throw new Error(`GET adjustments failed with status ${getRes.status}`);
  }
  console.log(`Initial Stock Adjustments Count: ${getRes.body.data?.length || 0}`);

  // Fetch initial balance for Product #1 & Warehouse #1
  const initBal = await InventoryBalance.findOne({
    where: { tenantId: 1, storeId: 1, warehouseId: 1, productId: 1 },
  });
  const startQty = initBal ? Number(initBal.quantityOnHand) : 0;
  console.log(`Initial Inventory Balance for Product #1: ${startQty} units`);

  // 2. CREATE INCREASE (+10) ADJUSTMENT
  console.log('\n[2/5] Testing POST Increase Adjustment (+10 units)...');
  const incRes = await req
    .post('/api/v1/store/inventory-management/adjustments')
    .set('Authorization', 'Bearer ' + token)
    .send({
      warehouseId: 1,
      productId: 1,
      type: 'increase',
      quantity: 10,
      reasonCode: 'AUDIT',
      reason: 'Audit Count Found 10 Extra Units',
    });

  console.log(`Increase POST Status: ${incRes.status}`);
  if (incRes.status !== 201 && incRes.status !== 200) {
    throw new Error(`CREATE increase adjustment failed with status ${incRes.status}`);
  }

  const incAdjId = incRes.body.data.id;
  const incAdjNumber = incRes.body.data.adjustmentNumber;
  console.log(`✅ Increase Adjustment Created! ID: ${incAdjId}, Number: "${incAdjNumber}"`);

  // Verify Balance Increased by 10
  const afterIncBal = await InventoryBalance.findOne({
    where: { tenantId: 1, storeId: 1, warehouseId: 1, productId: 1 },
  });
  const afterIncQty = afterIncBal ? Number(afterIncBal.quantityOnHand) : 0;
  console.log(
    `New Inventory Balance after +10 Increase: ${afterIncQty} units (Diff: +${afterIncQty - startQty})`
  );

  if (afterIncQty !== startQty + 10) {
    throw new Error(`Inventory balance expected ${startQty + 10}, but got ${afterIncQty}`);
  }

  // 3. CREATE DECREASE (-5) ADJUSTMENT
  console.log('\n[3/5] Testing POST Decrease Adjustment (-5 units)...');
  const decRes = await req
    .post('/api/v1/store/inventory-management/adjustments')
    .set('Authorization', 'Bearer ' + token)
    .send({
      warehouseId: 1,
      productId: 1,
      type: 'decrease',
      quantity: 5,
      reasonCode: 'DAMAGED',
      reason: 'Damaged Goods Written Off',
    });

  console.log(`Decrease POST Status: ${decRes.status}`);
  if (decRes.status !== 201 && decRes.status !== 200) {
    throw new Error(`CREATE decrease adjustment failed with status ${decRes.status}`);
  }

  const decAdjId = decRes.body.data.id;
  console.log(`✅ Decrease Adjustment Created! ID: ${decAdjId}`);

  // Verify Balance Decreased by 5
  const afterDecBal = await InventoryBalance.findOne({
    where: { tenantId: 1, storeId: 1, warehouseId: 1, productId: 1 },
  });
  const afterDecQty = afterDecBal ? Number(afterDecBal.quantityOnHand) : 0;
  console.log(
    `New Inventory Balance after -5 Decrease: ${afterDecQty} units (Diff: -${afterIncQty - afterDecQty})`
  );

  if (afterDecQty !== afterIncQty - 5) {
    throw new Error(`Inventory balance expected ${afterIncQty - 5}, but got ${afterDecQty}`);
  }

  // 4. Verify Stock Movements Recorded in Database
  console.log('\n[4/5] Verifying Stock Movement Records in Database...');
  const movements = await StockMovement.findAll({
    where: { tenantId: 1, productId: 1 },
    order: [['id', 'DESC']],
    limit: 2,
  });
  if (movements.length < 2) {
    throw new Error(`Expected at least 2 stock movement records, found ${movements.length}`);
  }

  console.log(
    `✅ Stock Movements Recorded! Latest Movement: ${movements[0].direction} ${movements[0].quantity} units (Type: ${movements[0].movementType})`
  );

  // 5. DELETE Adjustment
  console.log('\n[5/5] Testing DELETE /api/v1/store/inventory-management/adjustments/:id...');
  const deleteRes = await req
    .delete(`/api/v1/store/inventory-management/adjustments/${decAdjId}`)
    .set('Authorization', 'Bearer ' + token);

  console.log(`DELETE Status: ${deleteRes.status}`);
  if (deleteRes.status !== 200) {
    throw new Error(`DELETE adjustment failed with status ${deleteRes.status}`);
  }
  console.log(`✅ Stock Adjustment ID ${decAdjId} deleted successfully via API!`);

  console.log('\n====================================================');
  console.log('🎉 STOCK ADJUSTMENTS MODULE VERIFIED 100% SUCCESS!');
  console.log('====================================================');
};

if (require.main === module) {
  runStockAdjustmentModuleVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification Error:', err);
      process.exit(1);
    });
}
