import express from 'express';
import { AdminInventoryController } from '../controllers/adminInventory.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/authz.middleware';

const router = express.Router();
const controller = new AdminInventoryController();

router.use(tenantResolver);
router.use(authenticate);
router.use(authorize);

router.get('/analytics', requirePermission('tenant.read'), controller.getAnalytics);
router.get('/warehouses', requirePermission('tenant.read'), controller.getWarehouseMonitoring);
router.get('/purchase-orders', requirePermission('tenant.read'), controller.getPurchaseOrders);
router.put(
  '/purchase-orders/:id/status',
  requirePermission('tenant.read'),
  controller.updatePurchaseOrderStatus
);

export default router;
