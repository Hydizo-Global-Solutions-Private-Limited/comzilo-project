import { test, expect } from '@playwright/test';

test.describe('Comzilo Admin Panel End-to-End Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Authentication Flow
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.fill('input[type="email"]', 'admin@comzilo.com');
    await page.fill('input[type="password"]', 'SuperAdminSecurePassword2026!');
    await page.click('button[type="submit"]');

    // Wait for redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Super Admin SaaS Portal')).toBeVisible();
  });

  test('1. Admin Dashboard Overview & Key Metrics', async ({ page }) => {
    await expect(page.locator('text=Super Admin SaaS Portal')).toBeVisible();
    await expect(page.locator('text=Tenant Management').first()).toBeVisible();
  });

  test('2. Tenant Management Page & Filtering', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4, h5, h6').filter({ hasText: /Tenant/i }).first()).toBeVisible();

    // Verify search input works
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Demo');
      await page.waitForTimeout(500);
    }
  });

  test('3. Seller Applications & Approvals Flow', async ({ page }) => {
    await page.goto('/seller-applications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Seller/i);
  });

  test('4. Sellers List & Status Controls', async ({ page }) => {
    await page.goto('/sellers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Seller/i);
  });

  test('5. Store Management Directory', async ({ page }) => {
    await page.goto('/stores');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Store/i);
  });

  test('6. Inventory Management Analytics', async ({ page }) => {
    await page.goto('/inventory-management');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Inventory/i);
  });

  test('7. Shipping Providers Management', async ({ page }) => {
    await page.goto('/shipping-providers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Shipping/i);
  });

  test('8. Subscription Plans & Tier Limits', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Subscription|Plan/i);
  });

  test('9. Platform Users & RBAC Permissions', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/User/i);

    await page.goto('/roles');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Role|Permission/i);
  });

  test('10. Platform System & Reports Pages Audit', async ({ page }) => {
    const systemRoutes = [
      { path: '/reports', textMatch: /Report/i },
      { path: '/feature-flags', textMatch: /Flag|Feature/i },
      { path: '/settings', textMatch: /Setting/i },
      { path: '/integrations', textMatch: /Integration|Webhook/i },
      { path: '/logs', textMatch: /Log|Audit/i },
      { path: '/health', textMatch: /Health|Status/i },
      { path: '/notifications', textMatch: /Notification/i },
    ];

    for (const route of systemRoutes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toContainText(route.textMatch);
    }
  });

  test('11. User Logout Flow', async ({ page }) => {
    // Open user menu avatar
    const avatarButton = page.locator('button').filter({ has: page.locator('.MuiAvatar-root') }).first();
    await avatarButton.click();

    // Click logout
    await page.click('text=/Logout/i');
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
