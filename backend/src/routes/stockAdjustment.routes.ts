import { Router } from 'express';
import { StockAdjustmentController } from '../controllers/stockAdjustment.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { authorize, requireAnyPermission } from '../middleware/authz.middleware';
import { validate as validateRequest } from '../middleware/validate';
import { adjustmentValidation } from '../validations/stockAdjustment.validation';

const router = Router();
const controller = new StockAdjustmentController();

router.use(tenantResolver);
router.use(requireAuth);
router.use(authorize);

router.get(
  '/',
  requireAnyPermission(['inventory.read', 'inventory.adjust', 'warehouse.view', 'store.view']),
  validateRequest({ query: adjustmentValidation.listAdjustments }),
  controller.listAdjustments
);

router.post(
  '/',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.create',
    'warehouse.manage',
    'store.manage',
  ]),
  validateRequest({ body: adjustmentValidation.createAdjustment }),
  controller.createAdjustment
);

router.get(
  '/:id',
  requireAnyPermission(['inventory.read', 'inventory.adjust', 'warehouse.view', 'store.view']),
  controller.getAdjustment
);

router.post(
  '/:id/approve',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.approveAdjustment
);

router.post(
  '/:id/reject',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.rejectAdjustment
);

router.post(
  '/:id/cancel',
  requireAnyPermission([
    'inventory.manage',
    'inventory.adjust',
    'warehouse.manage',
    'store.manage',
  ]),
  controller.cancelAdjustment
);

export { router as stockAdjustmentRoutes };
