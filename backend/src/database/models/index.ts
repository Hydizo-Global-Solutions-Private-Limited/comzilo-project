/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tenant } from './tenant';
import { User } from './user';
import { ShippingProvider } from './shippingProvider';
import { TenantShippingProviderConfig } from './tenantShippingProviderConfig';
import { PickupAddress, ShipmentPackage } from './pickupAddress';
import { GoodsIssue } from './goodsIssue';
import {
  Shipment,
  ShipmentTracking,
  ShippingLabel,
  ShippingLog,
  ProviderWebhook,
  ShippingRateRule,
} from './shipment';
import { UserProfile } from './userProfile';
import { RefreshToken } from './refreshToken';
import { LoginHistory } from './loginHistory';
import { UserDevice } from './userDevice';
import { OtpRequest } from './otpRequest';
import { PasswordResetToken } from './passwordResetToken';
import { Role } from './role';
import { Permission } from './permission';
import { RolePermission } from './rolePermission';
import { UserRole } from './userRole';
import { Store } from './store';
import { StoreDomain } from './storeDomain';
import { StoreSettings } from './storeSettings';
import { Plan } from './plan';
import { Subscription } from './subscription';
import { Media } from './media';
import { Product } from './product';
import { ProductMedia } from './productMedia';
import { ProductType } from './productType';
import { ProductImage } from './productImage';
import { ProductReview } from './productReview';
import { ProductVariant } from './productVariant';
import { ProductOptionSet } from './productOptionSet';
import { ProductOptionValue } from './productOptionValue';
import { ProductPrice } from './productPrice';
import { ProductDownload } from './productDownload';
import { ProductSeo } from './productSeo';
import { ProductShipping } from './productShipping';
import { ProductVirtual } from './productVirtual';
import { ProductPodTemplate } from './productPodTemplate';
import { PodDesignTemplate } from './podDesignTemplate';
import { PodClipart } from './podClipart';
import { PodSavedDesign } from './podSavedDesign';
import { PodPackagingModel } from './podPackagingModel';
import { PodCategory } from './podCategory';
import { PodTemplate } from './podTemplate';
import { PodCustomization } from './podCustomization';
import { ProductVersion } from './productVersion';
import { CategorySeo } from './categorySeo';
import { BrandSeo } from './brandSeo';
import { CollectionRule } from './collectionRule';
import { ProductAttribute } from './productAttribute';
import { ProductAttributeValue } from './productAttributeValue';
import { InventoryBatch } from './inventoryBatch';
import { InventorySerial } from './inventorySerial';
import { InventoryCycleCount } from './inventoryCycleCount';
import { StoreOrderShipment } from './storeOrderShipment';
import { StoreOrderReturn } from './storeOrderReturn';
import { StoreOrderStatusHistory } from './storeOrderStatusHistory';
import { ShippingZone } from './shippingZone';
import { ShippingMethod } from './shippingMethod';
import { ShippingCarrier } from './shippingCarrier';
import { ShipmentTrackingEvent } from './shipmentTrackingEvent';
import { ShipmentPickup } from './shipmentPickup';
import { PaymentGatewayConfig } from './paymentGatewayConfig';
import { PaymentTransactionAttempt } from './paymentTransactionAttempt';
import { PaymentSettlement } from './paymentSettlement';
import { PaymentReconciliation } from './paymentReconciliation';
import { CreditNote } from './creditNote';
import { WalletTransaction } from './walletTransaction';
import { CustomerSegment } from './customerSegment';
import { CustomerWishlist } from './customerWishlist';
import { WishlistItem } from './wishlistItem';
import { LoyaltyAccount } from './loyaltyAccount';
import { RewardTransaction } from './rewardTransaction';
import { SupportTicket } from './supportTicket';
import { TicketReply } from './ticketReply';
import { CustomerCommunicationLog } from './customerCommunicationLog';
import { MarketingPromotion } from './marketingPromotion';
import { Coupon } from './coupon';
import { CouponRedemption } from './couponRedemption';
import { GiftCard } from './giftCard';
import { GiftCardTransaction } from './giftCardTransaction';
import { ReferralProgram } from './referralProgram';
import { MarketingCampaign } from './marketingCampaign';
import { MarketingAutomation } from './marketingAutomation';
import { CmsTheme } from './cmsTheme';
import { CmsPage } from './cmsPage';
import { CmsPageVersion } from './cmsPageVersion';
import { CmsSection } from './cmsSection';
import { CmsNavigationMenu } from './cmsNavigationMenu';
import { CmsNavigationItem } from './cmsNavigationItem';
import { CmsBlogPost } from './cmsBlogPost';
import { CmsMediaAsset } from './cmsMediaAsset';
import { CmsForm } from './cmsForm';
import { CmsFormSubmission } from './cmsFormSubmission';
import { PosRegisterSession } from './posRegisterSession';
import { PosCashMovement } from './posCashMovement';
import { PosSale } from './posSale';
import { PosSaleItem } from './posSaleItem';
import { PosSalePayment } from './posSalePayment';
import { PosReturn } from './posReturn';
import { PosOfflineQueue } from './posOfflineQueue';
import { Supplier } from './supplier';
import { SupplierContact } from './supplierContact';
import { SupplierBankAccount } from './supplierBankAccount';
import { PurchaseRequest } from './purchaseRequest';
import { PurchaseRequestItem } from './purchaseRequestItem';
import { PurchaseOrder } from './purchaseOrder';
import { PurchaseOrderItem } from './purchaseOrderItem';
import { GoodsReceipt } from './goodsReceipt';
import { GoodsReceiptItem } from './goodsReceiptItem';
import { SupplierReturn } from './supplierReturn';
import { PurchaseInvoice } from './purchaseInvoice';
import { SupplierPayment } from './supplierPayment';
import { FinanceChartOfAccount } from './financeChartOfAccount';
import { FinanceJournalEntry } from './financeJournalEntry';
import { FinanceJournalLine } from './financeJournalLine';
import { FinanceGeneralLedger } from './financeGeneralLedger';
import { FinanceVendorBill } from './financeVendorBill';
import { FinanceCustomerInvoice } from './financeCustomerInvoice';
import { FinanceBankAccount } from './financeBankAccount';
import { FinanceBankReconciliation } from './financeBankReconciliation';
import { AnalyticsDashboard } from './analyticsDashboard';
import { AnalyticsWidget } from './analyticsWidget';
import { AnalyticsSavedReport } from './analyticsSavedReport';
import { AnalyticsKpi } from './analyticsKpi';
import { AnalyticsForecast } from './analyticsForecast';

// Step 11 Models
import { Category } from './category';
import { Brand } from './brand';
import { Collection } from './collection';
import { Tag } from './tag';
import { ProductCategory } from './productCategory';
import { ProductCollection } from './productCollection';
import { ProductTag } from './productTag';

// Step 12 Models
import { Warehouse } from './warehouse';
import { WarehouseLocation } from './warehouseLocation';
import { InventoryBalance } from './inventoryBalance';
import { StockMovement } from './stockMovement';
import { StockAdjustment } from './stockAdjustment';
import { StockTransfer } from './stockTransfer';
import { StockTransferItem } from './stockTransferItem';
import { StockReservation } from './stockReservation';
import { StockReservationItem } from './stockReservationItem';

// Step 13 Models
import { Customer } from './customer';
import { CustomerAddress } from './customerAddress';
import { CustomerPreference } from './customerPreference';
import { CustomerTag } from './customerTag';
import { CustomerTagAssignment } from './customerTagAssignment';
import { CustomerNote } from './customerNote';
import { CustomerDocument } from './customerDocument';

// Step 14 Models
import { Order } from './order';
import { OrderItem } from './orderItem';

// Step 15 Models
import { Payment } from './payment';
import { Refund } from './refund';
import { Invoice } from './invoice';

// Step 16 Models
import { POSRegister } from './posRegister';
import { POSSession } from './posSession';
import { Receipt } from './receipt';

// Step 18 Models
import { NotificationTemplate } from './notificationTemplate';
import { NotificationPreference } from './notificationPreference';
import { Notification } from './notification';
import { NotificationQueue } from './notificationQueue';

// Step 19 Models
import { TenantSettings } from './tenantSettings';
import { SystemSettings } from './systemSettings';
import { SettingsHistory } from './settingsHistory';
import { SellerBankAccount } from './sellerBankAccount';

// Step 20 Models
import { WebhookEndpoint } from './webhookEndpoint';
import { WebhookLog } from './webhookLog';
import { Integration } from './integration';
import { IntegrationSyncLog } from './integrationSyncLog';
import { SellerApplication } from './sellerApplication';
import { TicketMessage } from './ticketMessage';
import { TicketAttachment } from './ticketAttachment';
import { TicketInternalNote } from './ticketInternalNote';
import { SupportCannedResponse } from './supportCannedResponse';
import { SupportKnowledgeBase } from './supportKnowledgeBase';
import { SupportAuditLog } from './supportAuditLog';

// Establish Associations
// Tenant <-> User
Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User <-> UserProfile
User.hasOne(UserProfile, { foreignKey: 'user_id', as: 'profile' });
UserProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tenant <-> UserProfile
Tenant.hasMany(UserProfile, { foreignKey: 'tenant_id', as: 'profiles' });
UserProfile.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User <-> RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tenant <-> RefreshToken
Tenant.hasMany(RefreshToken, { foreignKey: 'tenant_id', as: 'refreshTokens' });
RefreshToken.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User <-> LoginHistory
User.hasMany(LoginHistory, { foreignKey: 'user_id', as: 'loginHistories' });
LoginHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tenant <-> LoginHistory
Tenant.hasMany(LoginHistory, { foreignKey: 'tenant_id', as: 'loginHistories' });
LoginHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User <-> UserDevice
User.hasMany(UserDevice, { foreignKey: 'user_id', as: 'devices' });
UserDevice.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tenant <-> UserDevice
Tenant.hasMany(UserDevice, { foreignKey: 'tenant_id', as: 'devices' });
UserDevice.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User <-> OtpRequest
User.hasMany(OtpRequest, { foreignKey: 'user_id', as: 'otps' });
OtpRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tenant <-> OtpRequest
Tenant.hasMany(OtpRequest, { foreignKey: 'tenant_id', as: 'otps' });
OtpRequest.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User <-> PasswordResetToken
User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'passwordResets' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Tenant <-> PasswordResetToken
Tenant.hasMany(PasswordResetToken, { foreignKey: 'tenant_id', as: 'passwordResets' });
PasswordResetToken.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Self-association for RefreshToken rotated lineages
RefreshToken.belongsTo(RefreshToken, { foreignKey: 'rotated_from', as: 'previousToken' });

// Role & Permission Junction
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  as: 'roles',
});

// User & Role Junction
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', as: 'users' });

// UserRole specific associations
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'userRoles' });
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'userRoles' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

Tenant.hasMany(UserRole, { foreignKey: 'tenant_id', as: 'userRoles' });
UserRole.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Store.hasMany(UserRole, { foreignKey: 'store_id', as: 'userRoles' });
UserRole.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

// Tenant <-> Store
Tenant.hasMany(Store, { foreignKey: 'tenant_id', as: 'stores' });
Store.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Store <-> StoreDomain
Store.hasMany(StoreDomain, { foreignKey: 'store_id', as: 'domains' });
StoreDomain.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

// Tenant <-> StoreDomain
Tenant.hasMany(StoreDomain, { foreignKey: 'tenant_id', as: 'domains' });
StoreDomain.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Store <-> StoreSettings
Store.hasMany(StoreSettings, { foreignKey: 'store_id', as: 'settings' });
StoreSettings.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

// Tenant <-> StoreSettings
Tenant.hasMany(StoreSettings, { foreignKey: 'tenant_id', as: 'storeSettings' });
StoreSettings.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Tenant <-> Subscription
Tenant.hasMany(Subscription, { foreignKey: 'tenant_id', as: 'subscriptions' });
Subscription.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Plan <-> Subscription
Plan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

// Tenant <-> Media
Tenant.hasMany(Media, { foreignKey: 'tenant_id', as: 'media' });
Media.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Tenant <-> Product
Tenant.hasMany(Product, { foreignKey: 'tenant_id', as: 'products' });
Product.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Store <-> Product
Store.hasMany(Product, { foreignKey: 'store_id', as: 'products' });
Product.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

// Product <-> ProductType
ProductType.hasMany(Product, { foreignKey: 'product_type_id', as: 'products' });
Product.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'productTypeRecord' });

// Product <-> ProductVariant
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductOptionSet & ProductOptionValue
Product.hasMany(ProductOptionSet, { foreignKey: 'product_id', as: 'optionSets' });
ProductOptionSet.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductOptionSet.hasMany(ProductOptionValue, { foreignKey: 'option_set_id', as: 'values' });
ProductOptionValue.belongsTo(ProductOptionSet, { foreignKey: 'option_set_id', as: 'optionSet' });

// Product <-> ProductPrice
Product.hasMany(ProductPrice, { foreignKey: 'product_id', as: 'prices' });
ProductPrice.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductDownload
Product.hasMany(ProductDownload, { foreignKey: 'product_id', as: 'downloads' });
ProductDownload.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductSeo
Product.hasOne(ProductSeo, { foreignKey: 'product_id', as: 'seoRecord' });
ProductSeo.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductShipping
Product.hasOne(ProductShipping, { foreignKey: 'product_id', as: 'shippingRecord' });
ProductShipping.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductVirtual
Product.hasOne(ProductVirtual, { foreignKey: 'product_id', as: 'virtualRecord' });
ProductVirtual.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductPodTemplate
Product.hasOne(ProductPodTemplate, { foreignKey: 'product_id', as: 'podTemplateRecord' });
ProductPodTemplate.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductImage
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product <-> ProductVersion
Product.hasMany(ProductVersion, { foreignKey: 'product_id', as: 'versions' });
ProductVersion.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User <-> Product (Creator/Updater)
User.hasMany(Product, { foreignKey: 'created_by', as: 'createdProducts' });
Product.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Product, { foreignKey: 'updated_by', as: 'updatedProducts' });
Product.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Product <-> Media Junction
Product.belongsToMany(Media, {
  through: ProductMedia,
  foreignKey: 'product_id',
  otherKey: 'media_id',
  as: 'media',
});
Media.belongsToMany(Product, {
  through: ProductMedia,
  foreignKey: 'media_id',
  otherKey: 'product_id',
  as: 'products',
});

// ProductMedia specific associations
Product.hasMany(ProductMedia, { foreignKey: 'product_id', as: 'productMedia' });
ProductMedia.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Media.hasMany(ProductMedia, { foreignKey: 'media_id', as: 'productMedia' });
ProductMedia.belongsTo(Media, { foreignKey: 'media_id', as: 'media' });

// --- STEP 11 ASSOCIATIONS ---

// Category
Category.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Category.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
Category.belongsTo(Media, { foreignKey: 'imageMediaId', as: 'image' });
Category.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Category.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
Category.hasOne(CategorySeo, { foreignKey: 'category_id', as: 'seoRecord' });
CategorySeo.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
ProductAttribute.hasMany(ProductAttributeValue, { foreignKey: 'attribute_id', as: 'values' });
ProductAttributeValue.belongsTo(ProductAttribute, { foreignKey: 'attribute_id', as: 'attribute' });
Category.belongsToMany(Product, {
  through: ProductCategory,
  foreignKey: 'category_id',
  otherKey: 'product_id',
  as: 'products',
});

// Brand
Brand.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Brand.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Brand.belongsTo(Media, { foreignKey: 'logo_media_id', as: 'logo' });
Brand.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Brand.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });

// Collection
Collection.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Collection.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Collection.belongsTo(Media, { foreignKey: 'image_media_id', as: 'image' });
Collection.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Collection.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
Collection.belongsToMany(Product, {
  through: ProductCollection,
  foreignKey: 'collection_id',
  otherKey: 'product_id',
  as: 'products',
});

// Tag
Tag.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Tag.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Tag.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Tag.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
Tag.belongsToMany(Product, {
  through: ProductTag,
  foreignKey: 'tag_id',
  otherKey: 'product_id',
  as: 'products',
});

// Product updates for classification
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brandRecord' });
Product.belongsToMany(Category, {
  through: ProductCategory,
  foreignKey: 'product_id',
  otherKey: 'category_id',
  as: 'categories',
});
Product.belongsToMany(Collection, {
  through: ProductCollection,
  foreignKey: 'product_id',
  otherKey: 'collection_id',
  as: 'collections',
});
Product.belongsToMany(Tag, {
  through: ProductTag,
  foreignKey: 'product_id',
  otherKey: 'tag_id',
  as: 'tags',
});

// Junction explicit associations for query flexibility
ProductCategory.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductCategory.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
ProductCollection.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductCollection.belongsTo(Collection, { foreignKey: 'collection_id', as: 'collection' });
ProductTag.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductTag.belongsTo(Tag, { foreignKey: 'tag_id', as: 'tag' });

// Step 12 Associations
Warehouse.hasMany(WarehouseLocation, { foreignKey: 'warehouse_id', as: 'locations' });
WarehouseLocation.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

Warehouse.hasMany(InventoryBalance, { foreignKey: 'warehouse_id', as: 'balances' });
InventoryBalance.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

WarehouseLocation.hasMany(InventoryBalance, {
  foreignKey: 'warehouse_location_id',
  as: 'balances',
});
InventoryBalance.belongsTo(WarehouseLocation, {
  foreignKey: 'warehouse_location_id',
  as: 'location',
});

Product.hasMany(InventoryBalance, { foreignKey: 'product_id', as: 'inventoryBalances' });
InventoryBalance.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'stockMovements' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Warehouse.hasMany(StockMovement, { foreignKey: 'warehouse_id', as: 'stockMovements' });
StockMovement.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

WarehouseLocation.hasMany(StockMovement, {
  foreignKey: 'warehouse_location_id',
  as: 'stockMovements',
});
StockMovement.belongsTo(WarehouseLocation, { foreignKey: 'warehouse_location_id', as: 'location' });

StockTransfer.hasMany(StockTransferItem, { foreignKey: 'stock_transfer_id', as: 'items' });
StockTransferItem.belongsTo(StockTransfer, { foreignKey: 'stock_transfer_id', as: 'transfer' });

StockTransferItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockTransferItem.belongsTo(WarehouseLocation, {
  foreignKey: 'source_location_id',
  as: 'sourceLocation',
});
StockTransferItem.belongsTo(WarehouseLocation, {
  foreignKey: 'destination_location_id',
  as: 'destinationLocation',
});

StockReservation.hasMany(StockReservationItem, { foreignKey: 'reservation_id', as: 'items' });
StockReservationItem.belongsTo(StockReservation, {
  foreignKey: 'reservation_id',
  as: 'reservation',
});

StockReservationItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockReservationItem.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockReservationItem.belongsTo(WarehouseLocation, {
  foreignKey: 'warehouse_location_id',
  as: 'location',
});

// Customer Associations
Customer.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Customer.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

Customer.hasMany(CustomerAddress, { foreignKey: 'customer_id', as: 'addresses' });
CustomerAddress.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Customer.hasOne(CustomerPreference, { foreignKey: 'customer_id', as: 'preference' });
CustomerPreference.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Customer.belongsToMany(CustomerTag, {
  through: CustomerTagAssignment,
  foreignKey: 'customer_id',
  otherKey: 'tag_id',
  as: 'tags',
});
CustomerTag.belongsToMany(Customer, {
  through: CustomerTagAssignment,
  foreignKey: 'tag_id',
  otherKey: 'customer_id',
  as: 'customers',
});

Customer.hasMany(CustomerNote, { foreignKey: 'customer_id', as: 'customerNotes' });
CustomerNote.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
CustomerNote.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

Customer.hasMany(CustomerDocument, { foreignKey: 'customer_id', as: 'documents' });
CustomerDocument.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
CustomerDocument.belongsTo(Media, { foreignKey: 'media_id', as: 'media' });

Customer.belongsTo(Media, { foreignKey: 'profile_image_id', as: 'profileImage' });

// Order Associations
Order.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Order.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Order.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Payment Associations
Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Payment.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Payment.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

Order.hasMany(Invoice, { foreignKey: 'order_id', as: 'invoices' });
Invoice.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Invoice.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Invoice.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

Payment.hasMany(Refund, { foreignKey: 'payment_id', as: 'refunds' });
Refund.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

Refund.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Refund.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

Order.hasMany(StoreOrderShipment, { foreignKey: 'order_id', as: 'shipments' });
StoreOrderShipment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(StoreOrderReturn, { foreignKey: 'order_id', as: 'returns' });
StoreOrderReturn.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(StoreOrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' });
StoreOrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

ShippingZone.hasMany(ShippingMethod, { foreignKey: 'zone_id', as: 'methods' });
ShippingMethod.belongsTo(ShippingZone, { foreignKey: 'zone_id', as: 'zone' });

CustomerWishlist.hasMany(WishlistItem, { foreignKey: 'wishlist_id', as: 'items' });
WishlistItem.belongsTo(CustomerWishlist, { foreignKey: 'wishlist_id', as: 'wishlist' });

LoyaltyAccount.hasMany(RewardTransaction, {
  foreignKey: 'loyalty_account_id',
  as: 'rewardTransactions',
});
RewardTransaction.belongsTo(LoyaltyAccount, {
  foreignKey: 'loyalty_account_id',
  as: 'loyaltyAccount',
});

SupportTicket.hasMany(TicketReply, { foreignKey: 'ticket_id', as: 'replies' });
TicketReply.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

Coupon.hasMany(CouponRedemption, { foreignKey: 'coupon_id', as: 'redemptions' });
CouponRedemption.belongsTo(Coupon, { foreignKey: 'coupon_id', as: 'coupon' });

GiftCard.hasMany(GiftCardTransaction, { foreignKey: 'gift_card_id', as: 'transactions' });
GiftCardTransaction.belongsTo(GiftCard, { foreignKey: 'gift_card_id', as: 'giftCard' });

CmsPage.hasMany(CmsSection, { foreignKey: 'page_id', as: 'sections' });
CmsSection.belongsTo(CmsPage, { foreignKey: 'page_id', as: 'page' });

CmsPage.hasMany(CmsPageVersion, { foreignKey: 'page_id', as: 'versions' });
CmsPageVersion.belongsTo(CmsPage, { foreignKey: 'page_id', as: 'page' });

CmsNavigationMenu.hasMany(CmsNavigationItem, { foreignKey: 'menu_id', as: 'items' });
CmsNavigationItem.belongsTo(CmsNavigationMenu, { foreignKey: 'menu_id', as: 'menu' });

CmsForm.hasMany(CmsFormSubmission, { foreignKey: 'form_id', as: 'submissions' });
CmsFormSubmission.belongsTo(CmsForm, { foreignKey: 'form_id', as: 'form' });

PosRegisterSession.hasMany(PosCashMovement, { foreignKey: 'session_id', as: 'cashMovements' });
PosCashMovement.belongsTo(PosRegisterSession, { foreignKey: 'session_id', as: 'session' });

PosRegisterSession.hasMany(PosSale, { foreignKey: 'session_id', as: 'sales' });
PosSale.belongsTo(PosRegisterSession, { foreignKey: 'session_id', as: 'session' });

PosSale.hasMany(PosSaleItem, { foreignKey: 'sale_id', as: 'items' });
PosSaleItem.belongsTo(PosSale, { foreignKey: 'sale_id', as: 'sale' });

PosSale.hasMany(PosSalePayment, { foreignKey: 'sale_id', as: 'payments' });
PosSalePayment.belongsTo(PosSale, { foreignKey: 'sale_id', as: 'sale' });

Supplier.hasMany(SupplierContact, { foreignKey: 'supplier_id', as: 'contacts' });
SupplierContact.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

Supplier.hasMany(SupplierBankAccount, { foreignKey: 'supplier_id', as: 'bankAccounts' });
SupplierBankAccount.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'request_id', as: 'items' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'request_id', as: 'request' });

PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId', as: 'purchaseOrders' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'poId', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'poId', as: 'po' });

GoodsReceipt.hasMany(GoodsReceiptItem, { foreignKey: 'grn_id', as: 'items' });
GoodsReceiptItem.belongsTo(GoodsReceipt, { foreignKey: 'grn_id', as: 'grn' });

PurchaseInvoice.hasMany(SupplierPayment, { foreignKey: 'invoice_id', as: 'payments' });
SupplierPayment.belongsTo(PurchaseInvoice, { foreignKey: 'invoice_id', as: 'invoice' });

FinanceJournalEntry.hasMany(FinanceJournalLine, { foreignKey: 'entry_id', as: 'lines' });
FinanceJournalLine.belongsTo(FinanceJournalEntry, { foreignKey: 'entry_id', as: 'entry' });

FinanceJournalLine.belongsTo(FinanceChartOfAccount, { foreignKey: 'account_id', as: 'account' });
FinanceChartOfAccount.hasMany(FinanceJournalLine, { foreignKey: 'account_id', as: 'lines' });

FinanceGeneralLedger.belongsTo(FinanceChartOfAccount, { foreignKey: 'account_id', as: 'account' });
FinanceChartOfAccount.hasMany(FinanceGeneralLedger, {
  foreignKey: 'account_id',
  as: 'ledgerEntries',
});

FinanceBankAccount.hasMany(FinanceBankReconciliation, {
  foreignKey: 'bank_account_id',
  as: 'reconciliations',
});
FinanceBankReconciliation.belongsTo(FinanceBankAccount, {
  foreignKey: 'bank_account_id',
  as: 'bankAccount',
});

AnalyticsDashboard.hasMany(AnalyticsWidget, { foreignKey: 'dashboard_id', as: 'widgets' });
AnalyticsWidget.belongsTo(AnalyticsDashboard, { foreignKey: 'dashboard_id', as: 'dashboard' });

// POS Associations
POSRegister.hasMany(POSSession, { foreignKey: 'register_id', as: 'sessions' });
POSSession.belongsTo(POSRegister, { foreignKey: 'register_id', as: 'register' });

POSSession.belongsTo(User, { foreignKey: 'cashier_id', as: 'cashier' });
POSSession.hasMany(Receipt, { foreignKey: 'pos_session_id', as: 'receipts' });
Receipt.belongsTo(POSSession, { foreignKey: 'pos_session_id', as: 'session' });

Order.hasOne(Receipt, { foreignKey: 'order_id', as: 'receipt' });
Receipt.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// --- STEP 18 ASSOCIATIONS ---
NotificationTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
NotificationTemplate.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

NotificationPreference.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
NotificationPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(NotificationPreference, { foreignKey: 'user_id', as: 'notificationPreference' });

Notification.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Notification.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(NotificationTemplate, { foreignKey: 'template_id', as: 'template' });

NotificationQueue.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
NotificationQueue.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification' });

// --- STEP 19 ASSOCIATIONS ---
TenantSettings.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Tenant.hasMany(TenantSettings, { foreignKey: 'tenant_id', as: 'tenantSettings' });

// --- STEP 20 ASSOCIATIONS ---
WebhookEndpoint.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
WebhookEndpoint.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
WebhookEndpoint.hasMany(WebhookLog, { foreignKey: 'webhook_endpoint_id', as: 'logs' });

WebhookLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
WebhookLog.belongsTo(WebhookEndpoint, { foreignKey: 'webhook_endpoint_id', as: 'endpoint' });

Integration.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Integration.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Integration.hasMany(IntegrationSyncLog, { foreignKey: 'integration_id', as: 'syncLogs' });

IntegrationSyncLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
IntegrationSyncLog.belongsTo(Integration, { foreignKey: 'integration_id', as: 'integration' });

export {
  Tenant,
  User,
  UserProfile,
  RefreshToken,
  LoginHistory,
  UserDevice,
  OtpRequest,
  PasswordResetToken,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Store,
  StoreDomain,
  StoreSettings,
  Plan,
  Subscription,
  Media,
  Product,
  ProductMedia,
  Category,
  Brand,
  Collection,
  Tag,
  ProductCategory,
  ProductCollection,
  ProductTag,
  Warehouse,
  WarehouseLocation,
  InventoryBalance,
  StockMovement,
  StockAdjustment,
  StockTransfer,
  StockTransferItem,
  StockReservation,
  StockReservationItem,
  Customer,
  CustomerAddress,
  CustomerPreference,
  CustomerTag,
  CustomerTagAssignment,
  CustomerNote,
  CustomerDocument,
  Order,
  OrderItem,
  Payment,
  Refund,
  Invoice,
  POSRegister,
  POSSession,
  Receipt,
  NotificationTemplate,
  NotificationPreference,
  Notification,
  NotificationQueue,
  TenantSettings,
  SystemSettings,
  SettingsHistory,
  WebhookEndpoint,
  WebhookLog,
  Integration,
  IntegrationSyncLog,
  SellerApplication,
  ProductType,
  ProductVariant,
  ProductOptionSet,
  ProductOptionValue,
  ProductPrice,
  ProductDownload,
  ProductSeo,
  ProductShipping,
  ProductVirtual,
  ProductPodTemplate,
  PodDesignTemplate,
  PodClipart,
  PodSavedDesign,
  PodPackagingModel,
  ProductVersion,
  CategorySeo,
  BrandSeo,
  CollectionRule,
  ProductAttribute,
  ProductAttributeValue,
  InventoryBatch,
  InventorySerial,
  InventoryCycleCount,
  StoreOrderShipment,
  StoreOrderReturn,
  StoreOrderStatusHistory,
  ShippingZone,
  ShippingMethod,
  ShippingCarrier,
  ShipmentTrackingEvent,
  ShipmentPickup,
  PaymentGatewayConfig,
  PaymentTransactionAttempt,
  PaymentSettlement,
  PaymentReconciliation,
  CreditNote,
  WalletTransaction,
  CustomerSegment,
  CustomerWishlist,
  WishlistItem,
  LoyaltyAccount,
  RewardTransaction,
  SupportTicket,
  TicketReply,
  CustomerCommunicationLog,
  MarketingPromotion,
  Coupon,
  CouponRedemption,
  GiftCard,
  GiftCardTransaction,
  ReferralProgram,
  MarketingCampaign,
  MarketingAutomation,
  CmsTheme,
  CmsPage,
  CmsPageVersion,
  CmsSection,
  CmsNavigationMenu,
  CmsNavigationItem,
  CmsBlogPost,
  CmsMediaAsset,
  CmsForm,
  CmsFormSubmission,
  PosRegisterSession,
  PosCashMovement,
  PosSale,
  PosSaleItem,
  PosSalePayment,
  PosReturn,
  PosOfflineQueue,
  Supplier,
  SupplierContact,
  SupplierBankAccount,
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  SupplierReturn,
  PurchaseInvoice,
  SupplierPayment,
  FinanceChartOfAccount,
  FinanceJournalEntry,
  FinanceJournalLine,
  FinanceGeneralLedger,
  FinanceVendorBill,
  FinanceCustomerInvoice,
  FinanceBankAccount,
  FinanceBankReconciliation,
  AnalyticsDashboard,
  AnalyticsWidget,
  AnalyticsSavedReport,
  AnalyticsKpi,
  AnalyticsForecast,
  ShippingProvider,
  TenantShippingProviderConfig,
  PickupAddress,
  ShipmentPackage,
  Shipment,
  ShipmentTracking,
  ShippingLabel,
  ShippingLog,
  ProviderWebhook,
  ShippingRateRule,
  GoodsIssue,
  ProductImage,
  TicketMessage,
  TicketAttachment,
  TicketInternalNote,
  SupportCannedResponse,
  SupportKnowledgeBase,
  SupportAuditLog,
  SellerBankAccount,
};

// Shipping Associations
ShippingProvider.hasMany(TenantShippingProviderConfig, {
  foreignKey: 'provider_id',
  as: 'tenantConfigs',
});
TenantShippingProviderConfig.belongsTo(ShippingProvider, {
  foreignKey: 'provider_id',
  as: 'provider',
});

Tenant.hasMany(TenantShippingProviderConfig, {
  foreignKey: 'tenant_id',
  as: 'shippingProviderConfigs',
});
TenantShippingProviderConfig.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(ShippingZone, { foreignKey: 'tenant_id', as: 'shippingZones' });
ShippingZone.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(ShippingMethod, { foreignKey: 'tenant_id', as: 'shippingMethods' });
ShippingMethod.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(PickupAddress, { foreignKey: 'tenant_id', as: 'pickupAddresses' });
PickupAddress.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(ShipmentPackage, { foreignKey: 'tenant_id', as: 'shipmentPackages' });
ShipmentPackage.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Shipment, { foreignKey: 'tenant_id', as: 'shipments' });
import { VariantAttribute, VariantImage, VariantInventory } from './productVariant';

import { AttributeGroup, CategoryAttribute, AttributeValue } from './categoryAttributeEngine';

export {
  VariantAttribute,
  VariantImage,
  VariantInventory,
  CategoryAttribute,
  AttributeGroup,
  AttributeValue,
  ProductReview,
};

// Product Review Associations
Product.hasMany(ProductReview, { foreignKey: 'product_id', as: 'reviews' });
ProductReview.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product Variant Associations
ProductVariant.hasMany(VariantAttribute, { foreignKey: 'variant_id', as: 'attributes' });
VariantAttribute.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

ProductVariant.hasMany(VariantImage, { foreignKey: 'variant_id', as: 'images' });
VariantImage.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

ProductVariant.hasMany(VariantInventory, { foreignKey: 'variant_id', as: 'inventories' });
VariantInventory.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
VariantInventory.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

// Category Attribute Engine Associations
AttributeGroup.hasMany(AttributeValue, { foreignKey: 'attribute_group_id', as: 'values' });
AttributeValue.belongsTo(AttributeGroup, { foreignKey: 'attribute_group_id', as: 'group' });

AttributeGroup.hasMany(CategoryAttribute, {
  foreignKey: 'attribute_group_id',
  as: 'categoryAttributes',
});
CategoryAttribute.belongsTo(AttributeGroup, { foreignKey: 'attribute_group_id', as: 'group' });

// --- POD ASSOCIATIONS ---
PodCategory.hasMany(PodTemplate, { foreignKey: 'category_id', as: 'templates' });
PodTemplate.belongsTo(PodCategory, { foreignKey: 'category_id', as: 'category' });

PodTemplate.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(PodTemplate, { foreignKey: 'product_id', as: 'podTemplates' });

Order.hasMany(PodCustomization, { foreignKey: 'order_id', as: 'podCustomizations' });
PodCustomization.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

OrderItem.hasOne(PodCustomization, { foreignKey: 'order_item_id', as: 'podCustomization' });
PodCustomization.belongsTo(OrderItem, { foreignKey: 'order_item_id', as: 'orderItem' });

PodCustomization.belongsTo(PodTemplate, { foreignKey: 'template_id', as: 'template' });
PodCustomization.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

export {
  PodCategory,
  PodTemplate,
  PodCustomization,
};

