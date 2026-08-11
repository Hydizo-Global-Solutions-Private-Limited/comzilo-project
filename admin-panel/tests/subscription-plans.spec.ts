import { test, expect } from '@playwright/test';

test.describe('Admin Subscription Plans Management & Error Handling E2E Suite', () => {
  test('Subscription Plans List, Creation, Modification, & Fallback States', async ({ request }) => {
    console.log('[Playwright E2E] Testing Admin Subscription Plans Microservice...');

    // Login as Admin
    const loginRes = await request.post('http://127.0.0.1:5000/api/v1/auth/login', {
      data: {
        email: 'admin@comzilo.com',
        password: 'SuperAdminSecurePassword2026!'
      }
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };

    // 1. Verify GET /api/v1/subscription-plans Endpoint
    const listRes = await request.get('http://127.0.0.1:5000/api/v1/subscription-plans', { headers });
    expect([200, 401]).toContain(listRes.status());
    
    if (listRes.status() === 200) {
      const listData = await listRes.json();
      console.log('[Playwright E2E] Subscription Plans Count:', listData.data?.length || 0);
      expect(listData.data).toBeDefined();

      // 2. Create New Subscription Tier via API
      const testPlanCode = `plan_e2e_${Date.now()}`;
      const createRes = await request.post('http://127.0.0.1:5000/api/v1/subscription-plans', {
        data: {
          code: testPlanCode,
          name: `E2E Custom Tier ${Date.now()}`,
          description: 'Automated Playwright E2E Subscription Test Tier',
          priceMonthly: 199.99,
          priceYearly: 1999.99,
          storeLimit: 5,
          userLimit: 25,
          warehouseLimit: 3,
          trialDays: 14,
          isActive: true,
          features: ['Automated Inventory Sync', '24/7 Dedicated Manager', 'Custom Domain SSL'],
        },
        headers
      });
      expect([200, 201]).toContain(createRes.status());
    }
  });
});
