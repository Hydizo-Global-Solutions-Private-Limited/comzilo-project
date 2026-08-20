import { Router } from 'express';
import { PodController } from '../controllers/pod.controller';
import { uploadPodDesignMiddleware } from '../middleware/podUpload.middleware';

const router = Router();
const controller = new PodController();

// Categories
router.get('/categories', controller.getCategories);
router.get('/categories/:slug', controller.getCategoryBySlug);
router.post('/categories', controller.createCategory);
router.put('/categories/:id', controller.updateCategory);
router.delete('/categories/:id', controller.deleteCategory);

// Templates
router.get('/templates', controller.getTemplates);
router.get('/templates/:id', controller.getTemplateById);
router.post('/templates', controller.createTemplate);
router.put('/templates/:id', controller.updateTemplate);
router.patch('/templates/:id/toggle', controller.toggleTemplateStatus);
router.delete('/templates/:id', controller.deleteTemplate);

// Customizations
router.post('/customizations', controller.saveCustomization);
router.get('/customizations/:id', controller.getCustomization);

// POD Orders
router.get('/orders', controller.getPodOrders);

// Image Upload
router.post('/upload', uploadPodDesignMiddleware.single('image'), controller.uploadDesignImage);
router.post('/upload-file', uploadPodDesignMiddleware.single('file'), controller.uploadDesignImage);

// Price calculation
router.post('/calculate-price', controller.calculatePrice);

export default router;
