/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const debugLiveMarketing = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('LIVE DIAGNOSTIC SUITE FOR MARKETING MODULE APIs');
  console.log('====================================================');

  // STEP 1: Verify Database Tables in MySQL
  console.log('\n[1] Checking MySQL Database Tables...');
  const tables: any[] = await sequelize.query('SHOW TABLES', { type: QueryTypes.SELECT });
  const tableNames = tables.map((t: any) => Object.values(t)[0]);
  console.log('Existing Database Tables:', tableNames);

  const requiredTables = [
    'marketing_campaigns',
    'notification_templates',
    'coupons',
    'orders',
    'customer_segments',
    'marketing_automations',
  ];

  for (const tbl of requiredTables) {
    const exists = tableNames.includes(tbl);
    console.log(`Table "${tbl}": ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
  }

  // STEP 2: Authenticate Seller User
  console.log('\n[2] Authenticating Seller User (admin@comzilo.com)...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  console.log('Login Response Status:', loginRes.status);
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    console.error('Login Failed!', loginRes.body);
    throw new Error('Authentication failed during diagnostic trace');
  }
  const token = loginRes.body.data.accessToken;
  console.log('✅ Token obtained successfully');

  // STEP 3: Test Every Single Marketing Endpoint & Log Stack Traces
  const endpoints = [
    { name: 'Dashboard', path: '/api/v1/marketing/dashboard' },
    { name: 'Email Providers', path: '/api/v1/marketing/email-providers' },
    { name: 'Email Templates', path: '/api/v1/marketing/email-templates' },
    { name: 'Campaigns', path: '/api/v1/marketing/campaigns' },
    { name: 'Coupons', path: '/api/v1/marketing/coupons' },
    { name: 'Abandoned Carts', path: '/api/v1/marketing/abandoned-carts' },
    { name: 'Customer Segments', path: '/api/v1/marketing/segments' },
    { name: 'Automation Rules', path: '/api/v1/marketing/automation-rules' },
  ];

  console.log('\n[3] Testing REST Endpoints with Bearer Token...');
  for (const ep of endpoints) {
    console.log(`\n--- TESTING ${ep.name} (${ep.path}) ---`);
    try {
      const res = await req.get(ep.path).set('Authorization', `Bearer ${token}`);
      console.log(`HTTP Status: ${res.status}`);
      if (res.status !== 200) {
        console.error(`❌ FAILURE on ${ep.name}:`, JSON.stringify(res.body, null, 2));
      } else {
        console.log(
          `✅ SUCCESS on ${ep.name}! Sample Data:`,
          JSON.stringify(res.body?.data || res.body, null, 2).slice(0, 300)
        );
      }
    } catch (err: any) {
      console.error(`💥 EXCEPTION on ${ep.name}:`, err);
    }
  }
};

debugLiveMarketing()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FATAL DIAGNOSTIC ERROR:', err);
    process.exit(1);
  });
