import { Router } from 'express';
import { PodStudioController } from '../controllers/podStudio.controller';
import { getEnterprisePodTemplateByProduct } from '../controllers/enterprisePodController';

const router = Router();
const controller = new PodStudioController();

router.get('/engine/product/:productId', getEnterprisePodTemplateByProduct);
router.get('/templates', controller.getTemplates);
router.post('/templates', controller.createTemplate);
router.get('/cliparts', controller.getCliparts);
router.post('/designs/save', controller.saveDesign);
router.get('/designs/:id', controller.getSavedDesign);
router.get('/3d-models', controller.getPackagingModels);
router.post('/calculate-price', controller.calculatePrice);
router.post('/designs/export-print', controller.exportPrintPackage);

export default router;
