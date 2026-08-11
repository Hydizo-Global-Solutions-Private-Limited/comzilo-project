import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { WarehouseLocationController } from '../controllers/warehouseLocation.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { authorize, requireAnyPermission } from '../middleware/authz.middleware';
import { validate as validateRequest } from '../middleware/validate';
import { warehouseValidation } from '../validations/warehouse.validation';
import { locationValidation } from '../validations/warehouseLocation.validation';

const router = Router();
const controller = new WarehouseController();
const locationController = new WarehouseLocationController();

router.use(tenantResolver);
router.use(requireAuth);
router.use(authorize);

// Warehouse locations sub-routes under warehouses
router.get(
  '/:warehouseId/locations',
  requireAnyPermission(['warehouse_location.read', 'warehouse.read', 'warehouse.view']),
  validateRequest({ query: locationValidation.listLocations }),
  locationController.listLocations
);

router.post(
  '/:warehouseId/locations',
  requireAnyPermission(['warehouse_location.create', 'warehouse.create', 'warehouse.manage']),
  validateRequest({ body: locationValidation.createLocation }),
  locationController.createLocation
);

// Warehouse routes
router.get(
  '/',
  requireAnyPermission(['warehouse.read', 'warehouse.view', 'inventory.read']),
  validateRequest({ query: warehouseValidation.listWarehouses }),
  controller.listWarehouses
);

router.post(
  '/',
  requireAnyPermission(['warehouse.create', 'warehouse.manage', 'inventory.manage']),
  validateRequest({ body: warehouseValidation.createWarehouse }),
  controller.createWarehouse
);

router.get(
  '/:id',
  requireAnyPermission(['warehouse.read', 'warehouse.view', 'inventory.read']),
  controller.getWarehouse
);

router.put(
  '/:id',
  requireAnyPermission(['warehouse.update', 'warehouse.manage', 'inventory.manage']),
  validateRequest({ body: warehouseValidation.updateWarehouse }),
  controller.updateWarehouse
);

router.delete(
  '/:id',
  requireAnyPermission(['warehouse.delete', 'warehouse.manage', 'inventory.manage']),
  controller.deleteWarehouse
);

router.post(
  '/:id/restore',
  requireAnyPermission(['warehouse.restore', 'warehouse.create', 'warehouse.manage']),
  controller.restoreWarehouse
);

router.patch(
  '/:id/default',
  requireAnyPermission(['warehouse.set_default', 'warehouse.update', 'warehouse.manage']),
  controller.setDefaultWarehouse
);

export { router as warehouseRoutes };
