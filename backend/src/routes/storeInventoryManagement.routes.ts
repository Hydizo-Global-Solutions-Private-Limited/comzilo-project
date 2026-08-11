import express from 'express';
import { StoreInventoryManagementController } from '../controllers/storeInventoryManagement.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requireAnyPermission } from '../middleware/authz.middleware';

const router = express.Router();
const controller = new StoreInventoryManagementController();

router.use(tenantResolver);
router.use(authenticate);
router.use(authorize);

router.get(
  '/dashboard',
  requireAnyPermission(['inventory.read', 'warehouse.read', 'warehouse.view']),
  controller.getDashboard
);
router.get(
  '/warehouses',
  requireAnyPermission(['warehouse.read', 'warehouse.view', 'inventory.read']),
  controller.getWarehouses
);
router.post(
  '/warehouses',
  requireAnyPermission(['warehouse.create', 'warehouse.manage', 'inventory.manage']),
  controller.createWarehouse
);
router.get(
  '/locations',
  requireAnyPermission([
    'warehouse.read',
    'warehouse.view',
    'warehouse_location.read',
    'inventory.read',
  ]),
  controller.getLocations
);
router.post(
  '/locations',
  requireAnyPermission([
    'warehouse.create',
    'warehouse.manage',
    'warehouse_location.create',
    'inventory.manage',
  ]),
  controller.createLocation
);

router.get(
  '/balances',
  requireAnyPermission(['inventory.read', 'warehouse.read', 'warehouse.view', 'store.view']),
  controller.getBalances
);
router.get(
  '/transfers',
  requireAnyPermission([
    'inventory.read',
    'warehouse.read',
    'warehouse.view',
    'inventory.transfer',
    'store.view',
  ]),
  controller.getTransfers
);
router.post(
  '/transfers',
  requireAnyPermission([
    'inventory.manage',
    'inventory.transfer',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.createTransfer
);

router.get(
  '/adjustments',
  requireAnyPermission(['inventory.read', 'inventory.adjust', 'warehouse.view', 'store.view']),
  controller.getAdjustments
);
router.get(
  '/adjustments/:id',
  requireAnyPermission(['inventory.read', 'inventory.adjust', 'warehouse.view', 'store.view']),
  controller.getAdjustmentById
);
router.post(
  '/adjustments',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.createAdjustment
);
router.put(
  '/adjustments/:id',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.update',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.updateAdjustment
);
router.delete(
  '/adjustments/:id',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.delete',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.deleteAdjustment
);

router.get(
  '/suppliers',
  requireAnyPermission([
    'inventory.read',
    'supplier.read',
    'warehouse.read',
    'warehouse.view',
    'store.view',
  ]),
  controller.getSuppliers
);
router.post(
  '/suppliers',
  requireAnyPermission([
    'inventory.manage',
    'supplier.create',
    'supplier.manage',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.createSupplier
);
router.put(
  '/suppliers/:id',
  requireAnyPermission([
    'inventory.manage',
    'supplier.create',
    'supplier.manage',
    'warehouse.update',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.updateSupplier
);
router.delete(
  '/suppliers/:id',
  requireAnyPermission([
    'inventory.manage',
    'supplier.create',
    'supplier.manage',
    'warehouse.delete',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.deleteSupplier
);

router.get(
  '/purchase-orders',
  requireAnyPermission(['inventory.read', 'po.read', 'warehouse.view', 'store.view']),
  controller.getPurchaseOrders
);
router.post(
  '/purchase-orders',
  requireAnyPermission([
    'inventory.manage',
    'po.create',
    'po.manage',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.createPurchaseOrder
);
router.put(
  '/purchase-orders/:id',
  requireAnyPermission([
    'inventory.manage',
    'po.create',
    'po.manage',
    'warehouse.update',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.updatePurchaseOrder
);
router.delete(
  '/purchase-orders/:id',
  requireAnyPermission([
    'inventory.manage',
    'po.create',
    'po.manage',
    'warehouse.delete',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.deletePurchaseOrder
);

router.get(
  '/goods-receipts',
  requireAnyPermission(['inventory.read', 'grn.read', 'warehouse.view', 'store.view']),
  controller.getGoodsReceipts
);
router.post(
  '/goods-receipts',
  requireAnyPermission([
    'inventory.manage',
    'grn.create',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.createGoodsReceipt
);

router.get(
  '/goods-issues',
  requireAnyPermission(['inventory.read', 'gin.read', 'warehouse.view', 'store.view']),
  controller.getGoodsIssues
);
router.post(
  '/goods-issues',
  requireAnyPermission([
    'inventory.manage',
    'gin.create',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.createGoodsIssue
);

router.get(
  '/batches',
  requireAnyPermission(['inventory.read', 'batch.read', 'warehouse.view', 'store.view']),
  controller.getBatches
);
router.get(
  '/serials',
  requireAnyPermission(['inventory.read', 'serial.read', 'warehouse.view', 'store.view']),
  controller.getSerials
);

export default router;
