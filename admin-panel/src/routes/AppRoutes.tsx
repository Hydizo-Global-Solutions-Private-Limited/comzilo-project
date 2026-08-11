import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PageLoader } from '../components/common/PageLoader';

import { AdminLoginPage } from '../pages/auth/AdminLoginPage';
import { AdminDashboardPage } from '../pages/dashboard/AdminDashboardPage';
import { TenantsPage } from '../pages/tenants/TenantsPage';
import { StoresPage } from '../pages/stores/StoresPage';
import { SubscriptionPlansPage } from '../pages/subscriptions/SubscriptionPlansPage';
import { PlatformUsersPage } from '../pages/users/PlatformUsersPage';
import { RolesPermissionsPage } from '../pages/roles/RolesPermissionsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { FeatureFlagsPage } from '../pages/flags/FeatureFlagsPage';
import { SystemSettingsPage } from '../pages/settings/SystemSettingsPage';
import { CommissionSettingsPage } from '../pages/settings/CommissionSettingsPage';
import { SettlementReportsPage } from '../pages/settlements/SettlementReportsPage';
import { AdminWithdrawalsPage } from '../pages/finance/AdminWithdrawalsPage';
import { AdminSellerBankAccountsPage } from '../pages/finance/AdminSellerBankAccountsPage';
import { RazorpayPayoutsPage } from '../pages/finance/RazorpayPayoutsPage';
import { FinancialDashboardPage } from '../pages/finance/FinancialDashboardPage';
import { AdminIntegrationsPage } from '../pages/integrations/AdminIntegrationsPage';
import { AuditLogsPage } from '../pages/logs/AuditLogsPage';
import { SystemHealthPage } from '../pages/health/SystemHealthPage';
import { SellerApplicationsPage } from '../pages/SellerApplicationsPage';
import { SellersListPage } from '../pages/SellersListPage';
import { AddSellerPage } from '../pages/AddSellerPage';
import { SellerDetailsPage } from '../pages/SellerDetailsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { AdminShippingProvidersPage } from '../pages/AdminShippingProvidersPage';
import { AdminInventoryPage } from '../pages/AdminInventoryPage';
import { AdminAttributeManagementPage } from '../pages/AdminAttributeManagementPage';
import { AdminCategoryPage } from '../pages/categories/AdminCategoryPage';

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<AdminLoginPage />} />

        {/* Protected Routes inside AdminLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboardPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/seller-applications" element={<SellerApplicationsPage />} />
            <Route path="/sellers" element={<SellersListPage />} />
            <Route path="/sellers/add" element={<AddSellerPage />} />
            <Route path="/sellers/:id" element={<SellerDetailsPage />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/categories" element={<AdminCategoryPage />} />
            <Route path="/inventory-management" element={<AdminInventoryPage />} />
            <Route path="/attributes" element={<AdminAttributeManagementPage />} />
            <Route path="/shipping-providers" element={<AdminShippingProvidersPage />} />
            <Route path="/subscriptions" element={<SubscriptionPlansPage />} />
            <Route path="/users" element={<PlatformUsersPage />} />
            <Route path="/roles" element={<RolesPermissionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/feature-flags" element={<FeatureFlagsPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
            <Route path="/commission-settings" element={<CommissionSettingsPage />} />
            <Route path="/settings/commission" element={<CommissionSettingsPage />} />
            <Route path="/settlements" element={<SettlementReportsPage />} />
            <Route path="/settlement-reports" element={<SettlementReportsPage />} />
            <Route path="/seller-bank-accounts" element={<AdminSellerBankAccountsPage />} />
            <Route path="/finance/bank-accounts" element={<AdminSellerBankAccountsPage />} />
            <Route path="/withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="/finance/withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="/finance" element={<FinancialDashboardPage />} />
            <Route path="/finance/dashboard" element={<FinancialDashboardPage />} />
            <Route path="/financial-dashboard" element={<FinancialDashboardPage />} />
            <Route path="/integrations" element={<AdminIntegrationsPage />} />
            <Route path="/logs" element={<AuditLogsPage />} />
            <Route path="/health" element={<SystemHealthPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
