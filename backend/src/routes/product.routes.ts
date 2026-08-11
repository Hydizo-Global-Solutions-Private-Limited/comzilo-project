import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/authz.middleware';
import { validate as validateRequest } from '../middleware/validate';
import { productValidation } from '../validations/product.validation';
import { uploadProductImageMiddleware } from '../middleware/upload.middleware';

const router = Router();
const controller = new ProductController();

// All product routes require tenant context resolution
router.use(tenantResolver);

// Public storefront catalog & review endpoints
router.get('/types', controller.getProductTypes);
router.get(
  '/',
  validateRequest({ query: productValidation.listProducts }),
  controller.listProducts
);
router.get('/:id/reviews', controller.getProductReviews);
router.post('/:id/reviews', controller.createProductReview);
router.post('/reviews/:reviewId/helpful', controller.markReviewHelpful);
router.get('/:id', controller.getProduct);

// Protected management endpoints (require authentication & authorization)
router.post(
  '/',
  requireAuth,
  authorize,
  requirePermission('product.create'),
  validateRequest({ body: productValidation.createProduct }),
  controller.createProduct
);

router.put(
  '/:id',
  requireAuth,
  authorize,
  requirePermission('product.update', 'id'),
  validateRequest({ body: productValidation.updateProduct }),
  controller.updateProduct
);

router.delete(
  '/:id',
  requireAuth,
  authorize,
  requirePermission('product.delete', 'id'),
  controller.deleteProduct
);

router.post(
  '/:id/restore',
  requireAuth,
  authorize,
  requirePermission('product.delete', 'id'),
  controller.restoreProduct
);

// Product Image Management Endpoints
router.get('/:id/images', controller.getProductImages);
router.post(
  '/:id/images',
  uploadProductImageMiddleware.single('image'),
  controller.uploadProductImage
);
router.delete('/:id/images/:imageId', controller.deleteProductImage);

export { router as productRoutes };
