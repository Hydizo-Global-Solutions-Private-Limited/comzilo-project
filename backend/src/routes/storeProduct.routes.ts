import express from 'express';
import { StoreProductController } from '../controllers/storeProduct.controller';
import { ProductController } from '../controllers/product.controller';
import { uploadProductImageMiddleware } from '../middleware/upload.middleware';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authz.middleware';

const router = express.Router();
const productController = new ProductController();

router.use(tenantResolver);
router.use(authenticate);
router.use(authorize);

router.get('/', StoreProductController.getProducts);
router.get('/:id', StoreProductController.getProductById);
router.post('/', StoreProductController.createProduct);
router.patch('/:id', StoreProductController.updateProduct);
router.delete('/:id', StoreProductController.deleteProduct);
router.post('/bulk-action', StoreProductController.bulkAction);

// Image management endpoints for store products
router.get('/:id/images', productController.getProductImages);
router.post('/:id/images', uploadProductImageMiddleware.single('image'), productController.uploadProductImage);
router.delete('/:id/images/:imageId', productController.deleteProductImage);

export default router;
