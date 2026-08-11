import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { PurchaseOrder, PurchaseOrderItem, Supplier } from '../models';

export const runPurchaseOrderModuleVerification = async () => {
  console.log('====================================================');
  console.log('PURCHASE ORDER MODULE END-TO-END VERIFICATION');
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

  // Fetch or create a supplier first
  let supplier = await Supplier.findOne({ where: { tenantId: 1 } });
  if (!supplier) {
    supplier = await Supplier.create({
      tenantId: 1,
      storeId: 1,
      name: 'Verification Supplier Pvt Ltd',
      code: 'SUP-TEST-' + Date.now().toString().slice(-4),
    });
  }

  // 1. GET Purchase Orders List
  console.log('\n[1/4] Testing GET /api/v1/store/inventory-management/purchase-orders...');
  const getRes = await req
    .get('/api/v1/store/inventory-management/purchase-orders')
    .set('Authorization', 'Bearer ' + token);

  console.log(`GET Status: ${getRes.status}`);
  if (getRes.status !== 200) {
    throw new Error(`GET purchase orders failed with status ${getRes.status}`);
  }
  console.log(`Initial Purchase Orders Count: ${getRes.body.data?.length || 0}`);

  // 2. CREATE Purchase Order
  console.log('\n[2/4] Testing POST /api/v1/store/inventory-management/purchase-orders...');
  const createRes = await req
    .post('/api/v1/store/inventory-management/purchase-orders')
    .set('Authorization', 'Bearer ' + token)
    .send({
      supplierId: supplier.id,
      warehouseId: 1,
      totalAmount: 15000.0,
      subtotal: 15000.0,
      expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      items: [
        {
          productId: 1,
          quantity: 150,
          unitPrice: 100.0,
        },
      ],
    });

  console.log(`POST Status: ${createRes.status}`);
  console.log(`POST Response Body:`, JSON.stringify(createRes.body, null, 2));

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`CREATE purchase order failed with status ${createRes.status}`);
  }

  const poId = createRes.body.data.id;
  const poNumber = createRes.body.data.poNumber;
  console.log(`✅ Purchase Order Created Successfully! ID: ${poId}, PO Number: "${poNumber}"`);

  // 3. Verify Database Record Persistence in purchase_orders & purchase_order_items
  console.log(
    '\n[3/4] Verifying Database Record Persistence in purchase_orders & purchase_order_items...'
  );
  const dbPo = await PurchaseOrder.findOne({ where: { id: poId } });
  if (!dbPo) {
    throw new Error(`Purchase order ID ${poId} not found in MySQL purchase_orders table!`);
  }

  const dbItems = await PurchaseOrderItem.findAll({ where: { poId } });
  if (dbItems.length === 0) {
    throw new Error(
      `No purchase order items found for PO ID ${poId} in purchase_order_items table!`
    );
  }

  console.log(
    `✅ PO persisted in DB! ID: ${dbPo.id}, PO Number: "${dbPo.poNumber}", Items Count: ${dbItems.length}`
  );
  console.log(
    `First Line Item: Product ID ${dbItems[0].productId}, Qty: ${dbItems[0].orderedQuantity}, Unit Price: ₹${dbItems[0].unitPrice}`
  );

  // 4. UPDATE & DELETE Purchase Order
  console.log('\n[4/4] Testing DELETE /api/v1/store/inventory-management/purchase-orders/:id...');
  const deleteRes = await req
    .delete(`/api/v1/store/inventory-management/purchase-orders/${poId}`)
    .set('Authorization', 'Bearer ' + token);

  console.log(`DELETE Status: ${deleteRes.status}`);
  if (deleteRes.status !== 200) {
    throw new Error(`DELETE purchase order failed with status ${deleteRes.status}`);
  }
  console.log(`✅ Purchase Order ID ${poId} deleted successfully via API!`);

  console.log('\n====================================================');
  console.log('🎉 PURCHASE ORDER MODULE VERIFIED 100% SUCCESS!');
  console.log('====================================================');
};

if (require.main === module) {
  runPurchaseOrderModuleVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification Error:', err);
      process.exit(1);
    });
}
