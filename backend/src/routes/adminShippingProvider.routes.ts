import express from 'express';
import { AdminShippingProviderController } from '../controllers/adminShippingProvider.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/authz.middleware';

const router = express.Router();
const controller = new AdminShippingProviderController();

router.use(tenantResolver);
router.use(authenticate);
router.use(authorize);

router.get('/providers', requirePermission('tenant.read'), controller.getGlobalProviders);
router.patch(
  '/providers/:id/status',
  requirePermission('tenant.update'),
  controller.updateProviderStatus
);
router.get('/analytics', requirePermission('tenant.read'), controller.getGlobalAnalytics);

export default router;
