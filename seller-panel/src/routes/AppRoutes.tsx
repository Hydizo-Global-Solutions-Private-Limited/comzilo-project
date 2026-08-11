import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { PosLayout } from '../layouts/PosLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PermissionGuard } from './PermissionGuard';
import { PageLoader } from '../components/common/PageLoader';

import { LoginPage } from '../pages/auth/LoginPage';
import { SellerRegisterPage } from '../pages/auth/SellerRegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { ProfilePage } from '../pages/auth/ProfilePage';
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { SubscriptionPage } from '../pages/settings/SubscriptionPage';
import { WalletPage } from '../pages/finance/WalletPage';
import { SellerFinancialDashboardPage } from '../pages/finance/SellerFinancialDashboardPage';
import { SellerBankAccountPage } from '../pages/finance/SellerBankAccountPage';
import { CustomerPaymentCenterPage } from '../pages/customer/CustomerPaymentCenterPage';

import { ProductsPage } from '../features/products/pages/ProductsPage';
import { SellerPodTemplatesPage } from '../pages/store/SellerPodTemplatesPage';
import { CatalogLayout } from '../features/catalog/components/CatalogLayout';
import { CategoriesPage } from '../features/catalog/pages/CategoriesPage';
import { BrandsPage } from '../features/catalog/pages/BrandsPage';
import { CollectionsPage } from '../features/catalog/pages/CollectionsPage';
import { AttributesPage } from '../features/catalog/pages/AttributesPage';
import { TagsPage } from '../features/catalog/pages/TagsPage';

import { MarketingLayout } from '../features/marketing/components/MarketingLayout';
import { MarketingDashboardPage } from '../features/marketing/pages/MarketingDashboardPage';
import { EmailProvidersPage } from '../features/marketing/pages/EmailProvidersPage';
import { EmailTemplatesPage } from '../features/marketing/pages/EmailTemplatesPage';
import { CampaignsPage } from '../features/marketing/pages/CampaignsPage';
import { CouponsPage } from '../features/marketing/pages/CouponsPage';
import { AbandonedCartPage } from '../features/marketing/pages/AbandonedCartPage';
import { CustomerSegmentsPage } from '../features/marketing/pages/CustomerSegmentsPage';
import { AutomationRulesPage } from '../features/marketing/pages/AutomationRulesPage';
import { MarketingAnalyticsPage } from '../features/marketing/pages/MarketingAnalyticsPage';
import { EmailLogsPage } from '../features/marketing/pages/EmailLogsPage';

import { WarehousesPage } from '../features/inventory/pages/WarehousesPage';
import { WarehouseLocationsPage } from '../features/inventory/pages/WarehouseLocationsPage';
import { StockBalancesPage } from '../features/inventory/pages/StockBalancesPage';
import { StockMovementsPage } from '../features/inventory/pages/StockMovementsPage';
import { StockAdjustmentsPage } from '../features/inventory/pages/StockAdjustmentsPage';
import { StockTransfersPage } from '../features/inventory/pages/StockTransfersPage';
import { StockReservationsPage } from '../features/inventory/pages/StockReservationsPage';

import { CustomersPage } from '../features/customers/pages/CustomersPage';
import { CustomerAddressesPage } from '../features/customers/pages/CustomerAddressesPage';
import { CustomerDocumentsPage } from '../features/customers/pages/CustomerDocumentsPage';
import { OrdersPage } from '../features/orders/pages/OrdersPage';
import { InvoicesPage } from '../features/orders/pages/InvoicesPage';
import { PaymentsPage } from '../features/payments/pages/PaymentsPage';
import { RefundsPage } from '../features/payments/pages/RefundsPage';

import { PosTerminalPage } from '../features/pos/pages/PosTerminalPage';
import { ReceiptsPage } from '../features/pos/pages/ReceiptsPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { ShippingProvidersPage } from '../pages/settings/ShippingProvidersPage';
import { InventoryManagementPage } from '../pages/inventory/InventoryManagementPage';
import { FinancePaymentsPage, FinanceRefundsPage, TaxesPage, ExpensesPage, ProfitLossPage } from '../pages/finance/FinancePages';
import { ReviewsPage, SupportTicketsPage, StaffManagementPage, LoyaltyProgramPage } from '../pages/store/StorePages';
import { SellerCustomerSupportPage } from '../pages/support/SellerCustomerSupportPage';
import { IntegrationsPage } from '../features/integrations/pages/IntegrationsPage';

import { PublicOrderTrackingPage } from '../pages/public/PublicOrderTrackingPage';

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Auth & Tracking Routes */}
        <Route path="/track/:orderNumber" element={<PublicOrderTrackingPage />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/seller/register" element={<SellerRegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Seller Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            {/* Catalog Routes */}
            <Route path="/products" element={<PermissionGuard permission="product.read"><ProductsPage /></PermissionGuard>} />
            <Route path="/pod-templates" element={<SellerPodTemplatesPage />} />
            <Route path="/categories" element={<PermissionGuard permission="category.read"><CategoriesPage /></PermissionGuard>} />
            <Route path="/brands" element={<PermissionGuard permission="brand.read"><BrandsPage /></PermissionGuard>} />
            <Route path="/collections" element={<PermissionGuard permission="collection.read"><CollectionsPage /></PermissionGuard>} />
            <Route path="/tags" element={<PermissionGuard permission="tag.read"><TagsPage /></PermissionGuard>} />

            {/* Catalog Workspace Routes */}
            <Route path="/catalog" element={<CatalogLayout />}>
              <Route index element={<Navigate to="/catalog/categories" replace />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="attributes" element={<AttributesPage />} />
              <Route path="tags" element={<TagsPage />} />
            </Route>

            {/* Phase 5 Marketing Workspace Routes */}
            <Route path="/marketing" element={<MarketingLayout />}>
              <Route index element={<Navigate to="/marketing/dashboard" replace />} />
              <Route path="dashboard" element={<MarketingDashboardPage />} />
              <Route path="email-providers" element={<EmailProvidersPage />} />
              <Route path="email-templates" element={<EmailTemplatesPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="coupons" element={<CouponsPage />} />
              <Route path="abandoned-carts" element={<AbandonedCartPage />} />
              <Route path="abandoned-cart" element={<AbandonedCartPage />} />
              <Route path="segments" element={<CustomerSegmentsPage />} />
              <Route path="customer-segments" element={<CustomerSegmentsPage />} />
              <Route path="automation-rules" element={<AutomationRulesPage />} />
              <Route path="analytics" element={<MarketingAnalyticsPage />} />
              <Route path="email-logs" element={<EmailLogsPage />} />
            </Route>

            {/* Inventory Routes */}
            <Route path="/warehouses" element={<PermissionGuard permission="warehouse.read"><WarehousesPage /></PermissionGuard>} />
            <Route path="/warehouse-locations" element={<PermissionGuard permission="warehouse_location.read"><WarehouseLocationsPage /></PermissionGuard>} />
            <Route path="/inventory" element={<PermissionGuard permission="inventory.read"><StockBalancesPage /></PermissionGuard>} />
            <Route path="/stock-movements" element={<PermissionGuard permission="stock_movement.read"><StockMovementsPage /></PermissionGuard>} />
            <Route path="/stock-adjustments" element={<PermissionGuard permission="stock_adjustment.read"><StockAdjustmentsPage /></PermissionGuard>} />
            <Route path="/stock-transfers" element={<PermissionGuard permission="stock_transfer.read"><StockTransfersPage /></PermissionGuard>} />
            <Route path="/stock-reservations" element={<PermissionGuard permission="stock_reservation.read"><StockReservationsPage /></PermissionGuard>} />

            {/* Sales & Financials Routes */}
            <Route path="/customers" element={<PermissionGuard permission="customer.read"><CustomersPage /></PermissionGuard>} />
            <Route path="/customer-addresses" element={<PermissionGuard permission="customer.read"><CustomerAddressesPage /></PermissionGuard>} />
            <Route path="/customer-documents" element={<PermissionGuard permission="customer.read"><CustomerDocumentsPage /></PermissionGuard>} />
            <Route path="/orders" element={<PermissionGuard permission="order.read"><OrdersPage /></PermissionGuard>} />
            <Route path="/invoices" element={<PermissionGuard permission="invoice.read"><InvoicesPage /></PermissionGuard>} />
            <Route path="/payments" element={<PermissionGuard permission="payment.read"><PaymentsPage /></PermissionGuard>} />
            <Route path="/refunds" element={<PermissionGuard permission="refund.read"><RefundsPage /></PermissionGuard>} />
            <Route path="/returns" element={<PermissionGuard permission="refund.read"><RefundsPage /></PermissionGuard>} />
            <Route path="/finance/payments" element={<FinancePaymentsPage />} />
            <Route path="/finance/refunds" element={<FinanceRefundsPage />} />
            <Route path="/finance/taxes" element={<TaxesPage />} />
            <Route path="/finance/expenses" element={<ExpensesPage />} />
            <Route path="/finance/pnl" element={<ProfitLossPage />} />

            {/* Store & Marketing Extended Routes */}
            <Route path="/store/reviews" element={<ReviewsPage />} />
            <Route path="/store/support-tickets" element={<SellerCustomerSupportPage />} />
            <Route path="/support/tickets" element={<SellerCustomerSupportPage />} />
            <Route path="/store/staff" element={<StaffManagementPage />} />
            <Route path="/marketing/loyalty" element={<LoyaltyProgramPage />} />

            {/* Platform Extensions & Reports */}
            <Route path="/receipts" element={<PermissionGuard permission="receipt.read"><ReceiptsPage /></PermissionGuard>} />
            <Route path="/reports" element={<PermissionGuard permission="report.read"><ReportsPage /></PermissionGuard>} />
            <Route path="/notifications" element={<PermissionGuard permission="notification.read"><NotificationsPage /></PermissionGuard>} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/settings/subscription" element={<SubscriptionPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/finance/wallet" element={<WalletPage />} />
            <Route path="/finance/bank-account" element={<SellerBankAccountPage />} />
            <Route path="/bank-account" element={<SellerBankAccountPage />} />
            <Route path="/withdrawals" element={<WalletPage />} />
            <Route path="/finance/withdrawals" element={<WalletPage />} />
            <Route path="/finance/dashboard" element={<SellerFinancialDashboardPage />} />
            <Route path="/finance" element={<SellerFinancialDashboardPage />} />
            <Route path="/customer/payments" element={<CustomerPaymentCenterPage />} />
            <Route path="/customer/invoices" element={<CustomerPaymentCenterPage />} />
            <Route path="/payments/center" element={<CustomerPaymentCenterPage />} />
            <Route path="/settings" element={<PermissionGuard permission="settings.read"><SettingsPage /></PermissionGuard>} />

            {/* Inventory Routes */}
            <Route path="/inventory/dashboard" element={<InventoryManagementPage defaultTab={0} />} />
            <Route path="/inventory/warehouses" element={<InventoryManagementPage defaultTab={1} />} />
            <Route path="/inventory/locations" element={<InventoryManagementPage defaultTab={2} />} />
            <Route path="/inventory/balances" element={<InventoryManagementPage defaultTab={3} />} />
            <Route path="/inventory/stock-management" element={<InventoryManagementPage defaultTab={4} />} />
            <Route path="/inventory/transfers" element={<InventoryManagementPage defaultTab={5} />} />
            <Route path="/inventory/adjustments" element={<InventoryManagementPage defaultTab={6} />} />
            <Route path="/inventory/suppliers" element={<InventoryManagementPage defaultTab={7} />} />
            <Route path="/inventory/purchase-orders" element={<InventoryManagementPage defaultTab={8} />} />
            <Route path="/inventory/grn" element={<InventoryManagementPage defaultTab={9} />} />
            <Route path="/inventory/gin" element={<InventoryManagementPage defaultTab={10} />} />
            <Route path="/inventory/barcode" element={<InventoryManagementPage defaultTab={11} />} />
            <Route path="/inventory/serials" element={<InventoryManagementPage defaultTab={12} />} />
            <Route path="/inventory/batches" element={<InventoryManagementPage defaultTab={13} />} />
            <Route path="/inventory/expiry" element={<InventoryManagementPage defaultTab={14} />} />
            <Route path="/inventory/reports" element={<InventoryManagementPage defaultTab={15} />} />

            {/* Shipping Routes */}
            <Route path="/shipping-providers" element={<ShippingProvidersPage defaultTab={0} />} />
            <Route path="/settings/shipping-providers" element={<ShippingProvidersPage defaultTab={0} />} />
            <Route path="/settings/shipping/zones" element={<ShippingProvidersPage defaultTab={1} />} />
            <Route path="/settings/shipping/methods" element={<ShippingProvidersPage defaultTab={2} />} />
            <Route path="/settings/shipping/pickup-addresses" element={<ShippingProvidersPage defaultTab={3} />} />
            <Route path="/settings/shipping/packaging" element={<ShippingProvidersPage defaultTab={4} />} />
            <Route path="/settings/shipping/labels" element={<ShippingProvidersPage defaultTab={5} />} />
            <Route path="/settings/shipping/logs" element={<ShippingProvidersPage defaultTab={6} />} />

            <Route path="/integrations" element={<PermissionGuard permission="marketplace.read"><IntegrationsPage /></PermissionGuard>} />
            <Route path="/finance" element={<SellerFinancialDashboardPage />} />
            <Route path="/finance/dashboard" element={<SellerFinancialDashboardPage />} />
            <Route path="/financial-dashboard" element={<SellerFinancialDashboardPage />} />
            <Route path="/customer/payments" element={<CustomerPaymentCenterPage />} />
            <Route path="/customer/invoices" element={<CustomerPaymentCenterPage />} />
            <Route path="/payments/center" element={<CustomerPaymentCenterPage />} />
          </Route>

          <Route element={<PosLayout />}>
            <Route path="/pos" element={<PermissionGuard permission="pos.access"><PosTerminalPage /></PermissionGuard>} />
          </Route>
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
