import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requestContext } from './middleware/requestContext';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { sendResponse, success, serviceUnavailable } from './shared/responses';
import { getDatabaseHealthStatus } from './shared/database/databaseHealth';
import { HTTP_STATUS } from './shared/constants';

const app = express();

// Security Headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS Configuration
const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):/i.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Tenant-UUID',
      'X-Tenant-Slug',
      'X-Store-ID',
      'X-Store-Slug',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  })
);

import path from 'path';

// Compression & Parser Middlewares
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Request Context Initialization
app.use(requestContext);

// Request Logger
app.use(requestLogger);

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED',
    errors: [],
  },
});
app.use(limiter);

// Health Check Endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    const dbStatus = await getDatabaseHealthStatus();
    const payload = {
      status: 'UP',
      database: dbStatus,
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      requestId: (req as any).context?.requestId || 'N/A',
    };

    if (dbStatus === 'DOWN') {
      return serviceUnavailable(res, 'Database is unavailable');
    }

    return success(res, 'Service health retrieved', payload);
  } catch (error) {
    return serviceUnavailable(res, 'Database connection failed');
  }
});

// Mount Auth Routes
import authRoutes from './routes/auth.routes';
app.use('/api/v1/auth', authRoutes);

import catalogRoutes from './routes/catalog.routes';
app.use('/api/v1/catalog', catalogRoutes);

import marketingRoutes from './routes/marketing.routes';
app.use('/api/v1/marketing', marketingRoutes);

import podStudioRoutes from './routes/podStudio.routes';
app.use('/api/v1/pod', podStudioRoutes);

// Mount Tenant & Store Routes
import tenantRoutes from './routes/tenant.routes';
import storeRoutes from './routes/store.routes';
import { productRoutes } from './routes/product.routes';
import { categoryRoutes } from './routes/category.routes';
import { brandRoutes } from './routes/brand.routes';
import { collectionRoutes } from './routes/collection.routes';
import { tagRoutes } from './routes/tag.routes';
import { productClassificationRoutes } from './routes/productClassification.routes';
import productVariantRoutes from './routes/productVariant.routes';
import attributeManagementRoutes from './routes/attributeManagement.routes';
import variantInventoryRoutes from './routes/variantInventory.routes';

// Step 12 Routes
import { warehouseRoutes } from './routes/warehouse.routes';
import { warehouseLocationRoutes } from './routes/warehouseLocation.routes';
import { inventoryRoutes } from './routes/inventory.routes';
import { stockMovementRoutes } from './routes/stockMovement.routes';
import { stockAdjustmentRoutes } from './routes/stockAdjustment.routes';
import { stockTransferRoutes } from './routes/stockTransfer.routes';
import { stockReservationRoutes } from './routes/stockReservation.routes';

// Step 13 Routes
import customerRoutes from './routes/customer.routes';
import customerAddressRoutes from './routes/customerAddress.routes';
import customerDocumentRoutes from './routes/customerDocument.routes';
import customerPortalRoutes from './routes/customerPortal.routes';

// Step 14 Routes
import orderRoutes from './routes/order.routes';

// Step 15 Routes
import paymentRoutes from './routes/payment.routes';
import invoiceRoutes from './routes/invoice.routes';
import refundRoutes from './routes/refund.routes';

// Step 16 Routes
import posRoutes from './routes/pos.routes';
import receiptRoutes from './routes/receipt.routes';

// Step 17 Routes
import reportRoutes from './routes/report.routes';

// Step 18 Routes
import notificationRoutes from './routes/notification.routes';
import templateRoutes from './routes/template.routes';
import preferenceRoutes from './routes/preference.routes';

// Step 19 Routes
import settingsRoutes from './routes/settings.routes';
import tenantSettingsRoutes from './routes/tenantSettings.routes';
import storeSettingsRoutes from './routes/storeSettings.routes';
import configurationRoutes from './routes/configuration.routes';

// Step 20 Routes
import webhookRoutes from './routes/webhook.routes';
import integrationRoutes from './routes/integration.routes';

app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/products', productClassificationRoutes);
app.use('/api/v1', productVariantRoutes);
app.use('/api/v1/admin/attributes', attributeManagementRoutes);
app.use('/api/v1/seller', variantInventoryRoutes);

app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/warehouse-locations', warehouseLocationRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/stock-movements', stockMovementRoutes);
app.use('/api/v1/stock-adjustments', stockAdjustmentRoutes);
app.use('/api/v1/stock-transfers', stockTransferRoutes);
app.use('/api/v1/stock-reservations', stockReservationRoutes);

app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/customer-portal', customerPortalRoutes);
app.use('/api/v1/customer-addresses', customerAddressRoutes);
app.use('/api/v1/customer-documents', customerDocumentRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/refunds', refundRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/receipts', receiptRoutes);
app.use('/api/v1/reports', reportRoutes);

app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notification-templates', templateRoutes);
app.use('/api/v1/notification-preferences', preferenceRoutes);

app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/tenant-settings', tenantSettingsRoutes);
app.use('/api/v1/store-settings', storeSettingsRoutes);
app.use('/api/v1/configuration', configurationRoutes);

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import sellerApplicationRoutes from './routes/sellerApplication.routes';
import adminSellerApplicationRoutes from './routes/adminSellerApplication.routes';
import adminSellerRoutes from './routes/adminSeller.routes';
import adminDashboardRoutes from './routes/adminDashboard.routes';
import adminSystemRoutes from './routes/adminSystem.routes';
import storeProductRoutes from './routes/storeProduct.routes';
import storeCatalogRoutes from './routes/storeCatalog.routes';
import storeInventoryRoutes from './routes/storeInventory.routes';
import storeOrderRoutes from './routes/storeOrder.routes';
import storeShippingRoutes from './routes/storeShipping.routes';
import storePaymentRoutes from './routes/storePayment.routes';
import storeCrmRoutes from './routes/storeCrm.routes';
import storeMarketingRoutes from './routes/storeMarketing.routes';
import storeCmsRoutes from './routes/storeCms.routes';
import storePosRoutes from './routes/storePos.routes';
import storePurchasingRoutes from './routes/storePurchasing.routes';
import storeFinanceRoutes from './routes/storeFinance.routes';
import storeAnalyticsRoutes from './routes/storeAnalytics.routes';

import adminShippingProviderRoutes from './routes/adminShippingProvider.routes';
import storeShippingProviderRoutes from './routes/storeShippingProvider.routes';

import adminInventoryRoutes from './routes/adminInventory.routes';
import storeInventoryManagementRoutes from './routes/storeInventoryManagement.routes';

import planRoutes from './routes/plan.routes';
import sellerSubscriptionRoutes from './routes/sellerSubscription.routes';
import sellerWalletRoutes from './routes/sellerWallet.routes';
import commissionEngineRoutes from './routes/commissionEngine.routes';
import automaticSettlementRoutes from './routes/automaticSettlement.routes';
import payoutRoutes from './routes/payout.routes';
import financialDashboardRoutes from './routes/financialDashboard.routes';
import customerPaymentRoutes from './routes/customerPayment.routes';

import sellerBankAccountRoutes from './routes/sellerBankAccount.routes';

app.use('/api/v1/subscription-plans', planRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/seller/subscription', sellerSubscriptionRoutes);
app.use('/api/v1/seller/wallet', sellerWalletRoutes);
import variantAnalyticsRoutes from './routes/variantAnalytics.routes';
import bulkVariantRoutes from './routes/bulkVariant.routes';

app.use('/api/v1/seller/analytics/variants', variantAnalyticsRoutes);
app.use('/api/v1/seller/bulk-variants', bulkVariantRoutes);
app.use('/api/v1/admin/withdrawals', sellerWalletRoutes);
app.use('/api/v1/commission', commissionEngineRoutes);
app.use('/api/v1/admin/commission', commissionEngineRoutes);
app.use('/api/v1/settlements', automaticSettlementRoutes);
app.use('/api/v1/admin/settlements', automaticSettlementRoutes);
app.use('/api/v1/admin/payouts', payoutRoutes);
app.use('/api/v1/admin/finance', financialDashboardRoutes);
app.use('/api/v1/customer', customerPaymentRoutes);
app.use('/api/v1', sellerBankAccountRoutes);
app.use('/api/v1/webhooks/razorpay-payouts', payoutRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/seller-applications', sellerApplicationRoutes);
app.use('/api/v1/public/seller', sellerApplicationRoutes);
app.use('/api/v1/public/seller-applications', sellerApplicationRoutes);
app.use('/api/v1/admin/seller-applications', adminSellerApplicationRoutes);
app.use('/api/v1/admin/sellers', adminSellerRoutes);
app.use('/api/v1/admin/shipping-providers', adminShippingProviderRoutes);
app.use('/api/v1/admin/inventory', adminInventoryRoutes);
app.use('/api/v1/admin/dashboard', adminDashboardRoutes);
import adminPlatformUserRoutes from './routes/adminPlatformUser.routes';
import adminRoleRoutes from './routes/adminRole.routes';

app.use('/api/v1/admin/platform-users', adminPlatformUserRoutes);
app.use('/api/v1/admin/users', adminPlatformUserRoutes);
app.use('/api/v1/admin/roles', adminRoleRoutes);
app.use('/api/v1/admin/permissions', adminRoleRoutes);
app.use('/api/v1/admin/system', adminSystemRoutes);
app.use('/api/v1/store/products', storeProductRoutes);
app.use('/api/v1/store/inventory-management', storeInventoryManagementRoutes);
app.use('/api/v1/store/inventory', storeInventoryRoutes);
app.use('/api/v1/store/orders', storeOrderRoutes);
app.use('/api/v1/orders', storeOrderRoutes);
app.use('/api/v1/store/shipping-providers', storeShippingProviderRoutes);
app.use('/api/v1/store/shipping', storeShippingRoutes);
app.use('/api/v1/store/payments', storePaymentRoutes);
app.use('/api/v1/store/crm', storeCrmRoutes);
app.use('/api/v1/store/marketing', storeMarketingRoutes);
app.use('/api/v1/store/cms', storeCmsRoutes);

import supportCenterRoutes from './routes/supportCenter.routes';
import podRoutes from './routes/pod.routes';

app.use('/api/v1/pod', podRoutes);
app.use('/api/v1/store/pod', podRoutes);
app.use('/api/v1/support', supportCenterRoutes);
app.use('/api/v1/store/pos', storePosRoutes);
app.use('/api/v1/store/purchasing', storePurchasingRoutes);
app.use('/api/v1/store/finance', storeFinanceRoutes);
app.use('/api/v1/store/analytics', storeAnalyticsRoutes);
app.use('/api/v1/store', storeCatalogRoutes);

// Swagger OpenAPI Documentation UI
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Fallback Route
app.use((req, res) => {
  return sendResponse(
    res,
    HTTP_STATUS.NOT_FOUND,
    false,
    `Cannot ${req.method} ${req.path}`,
    null,
    null,
    []
  );
});

// Error Handler
app.use(errorHandler);

export default app;
export { app };
