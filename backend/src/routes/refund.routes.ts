import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/authz.middleware';
import { validate as validateRequest } from '../middleware/validate';
import { paymentValidation } from '../validations/payment.validation';

const router = Router();
const controller = new PaymentController();

router.use(tenantResolver);
router.use(requireAuth);
router.use(authorize);

router.get(
  '/',
  requirePermission('refund.read'),
  validateRequest({ query: paymentValidation.listRefunds }),
  controller.listRefunds
);

router.post(
  '/',
  requirePermission('refund.create'),
  validateRequest({ body: paymentValidation.refundPayment }),
  controller.createRefund
);

router.get('/:id', requirePermission('refund.read'), controller.getRefund);

export default router;
export { router as refundRoutes };
