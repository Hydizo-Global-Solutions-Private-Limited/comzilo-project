import { Router } from 'express';
import { WarehouseLocationController } from '../controllers/warehouseLocation.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { authorize, requireAnyPermission } from '../middleware/authz.middleware';
import { validate as validateRequest } from '../middleware/validate';
import { locationValidation } from '../validations/warehouseLocation.validation';

const router = Router();
const controller = new WarehouseLocationController();

router.use(tenantResolver);
router.use(requireAuth);
router.use(authorize);

router.get(
  '/:id',
  requireAnyPermission(['warehouse_location.read', 'warehouse.read', 'warehouse.view']),
  controller.getLocation
);

router.put(
  '/:id',
  requireAnyPermission(['warehouse_location.update', 'warehouse.update', 'warehouse.manage']),
  validateRequest({ body: locationValidation.updateLocation }),
  controller.updateLocation
);

router.delete(
  '/:id',
  requireAnyPermission(['warehouse_location.delete', 'warehouse.delete', 'warehouse.manage']),
  controller.deleteLocation
);

router.post(
  '/:id/restore',
  requireAnyPermission(['warehouse_location.restore', 'warehouse.create', 'warehouse.manage']),
  controller.restoreLocation
);

router.patch(
  '/:id/default',
  requireAnyPermission(['warehouse_location.set_default', 'warehouse.update', 'warehouse.manage']),
  controller.setDefaultLocation
);

export { router as warehouseLocationRoutes };
