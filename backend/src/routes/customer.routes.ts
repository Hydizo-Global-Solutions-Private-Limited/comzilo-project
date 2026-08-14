import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { CustomerAddressController } from '../controllers/customerAddress.controller';
import { CustomerPreferenceController } from '../controllers/customerPreference.controller';
import { CustomerTagController } from '../controllers/customerTag.controller';
import { CustomerDocumentController } from '../controllers/customerDocument.controller';
import { CustomerNoteController } from '../controllers/customerNote.controller';
import { tenantResolver } from '../middleware/tenantResolver';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/authz.middleware';
import { validate as validateRequest } from '../middleware/validate';
import { customerValidation } from '../validations/customer.validation';

const router = Router();
const controller = new CustomerController();
const addressController = new CustomerAddressController();
const prefController = new CustomerPreferenceController();
const tagController = new CustomerTagController();
const docController = new CustomerDocumentController();
const noteController = new CustomerNoteController();

router.use(tenantResolver);
router.use(requireAuth);
router.use(authorize);

// Nested Customer Addresses Routes
router.get(
  '/:id/addresses',
  requirePermission('customer.address.read'),
  addressController.listAddresses
);
router.post(
  '/:id/addresses',
  requirePermission('customer.address.create'),
  validateRequest({ body: customerValidation.createAddress }),
  addressController.createAddress
);

// Nested Customer Preferences Routes
router.get(
  '/:id/preferences',
  requirePermission('customer.preference.read'),
  prefController.getPreferences
);
router.put(
  '/:id/preferences',
  requirePermission('customer.preference.update'),
  validateRequest({ body: customerValidation.updatePreferences }),
  prefController.updatePreferences
);

// Nested Customer Tags Routes
router.put(
  '/:id/tags',
  requirePermission('customer.tag.update'),
  validateRequest({ body: customerValidation.replaceTags }),
  tagController.replaceTags
);

// Nested Customer Documents Routes
router.get(
  '/:id/documents',
  requirePermission('customer.document.read'),
  docController.listDocuments
);
router.post(
  '/:id/documents',
  requirePermission('customer.document.upload'),
  validateRequest({ body: customerValidation.uploadDocument }),
  docController.uploadDocument
);

// Nested Customer Notes Routes
router.get('/:id/notes', requirePermission('customer.read'), noteController.listNotes);
router.post(
  '/:id/notes',
  requirePermission('customer.update'),
  validateRequest({ body: customerValidation.createNote }),
  noteController.createNote
);

// Customer Core Routes
router.get(
  '/',
  requirePermission('customer.read'),
  validateRequest({ query: customerValidation.listCustomers }),
  controller.listCustomers
);
router.post(
  '/',
  requirePermission('customer.create'),
  validateRequest({ body: customerValidation.createCustomer }),
  controller.createCustomer
);
router.get('/:id', requirePermission('customer.read'), controller.getCustomer);
router.put(
  '/:id',
  requirePermission('customer.update'),
  validateRequest({ body: customerValidation.updateCustomer }),
  controller.updateCustomer
);
router.delete('/:id', requirePermission('customer.delete'), controller.deleteCustomer);
router.post(
  '/:id/restore',
  requirePermission('customer.restore'),
  controller.restoreCustomer
);
router.post('/:id/block', requirePermission('customer.block'), controller.blockCustomer);
router.post(
  '/:id/unblock',
  requirePermission('customer.unblock'),
  controller.unblockCustomer
);
router.post(
  '/:id/deactivate',
  requirePermission('customer.update'),
  controller.deactivateCustomer
);
router.post(
  '/:id/activate',
  requirePermission('customer.update'),
  controller.activateCustomer
);

export default router;
