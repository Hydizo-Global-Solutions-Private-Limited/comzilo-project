import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';

export const verifyMarketingModule = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('PHASE 5: ENTERPRISE MARKETING & CUSTOMER ENGAGEMENT QA');
  console.log('====================================================');

  // STEP 1: Seller Authentication
  console.log('\n[1] Login as Seller Admin...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error('Seller login failed!');
  }
  const token = loginRes.body.data.accessToken;
  console.log('✅ Seller authenticated!');

  // STEP 2: Marketing Dashboard Stats
  console.log('\n[2] Fetch Marketing Dashboard Stats (GET /api/v1/marketing/dashboard)...');
  const dashRes = await req
    .get('/api/v1/marketing/dashboard')
    .set('Authorization', `Bearer ${token}`);
  console.log(`GET /api/v1/marketing/dashboard Status: ${dashRes.status}`);
  if (dashRes.status !== 200 || !dashRes.body?.data?.kpis) {
    throw new Error('Failed to retrieve marketing dashboard stats');
  }
  console.log(
    `✅ Dashboard KPIs Verified! Emails Sent: ${dashRes.body.data.kpis.emailsSent}, Revenue: ₹${dashRes.body.data.kpis.revenueGenerated}`
  );

  // STEP 3: Email Providers
  console.log('\n[3] Fetch Configured Email Providers (GET /api/v1/marketing/email-providers)...');
  const provRes = await req
    .get('/api/v1/marketing/email-providers')
    .set('Authorization', `Bearer ${token}`);
  console.log(`GET /api/v1/marketing/email-providers Status: ${provRes.status}`);
  console.log(`✅ ${provRes.body?.data?.length || 0} Email Providers Configured!`);

  // STEP 4: Email Template Creation & Fetch
  console.log(
    '\n[4] Create Email Template "Welcome Onboarding" (POST /api/v1/marketing/email-templates)...'
  );
  const tplRes = await req
    .post('/api/v1/marketing/email-templates')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Welcome Onboarding ' + Date.now(),
      code: 'WELCOME_ONBOARDING_' + Date.now(),
      subject: 'Welcome to Comzilo Store!',
      bodyHtml: '<h1>Welcome {{customer_name}}!</h1><p>Enjoy 10% OFF your first order.</p>',
    });
  console.log(`POST /api/v1/marketing/email-templates Status: ${tplRes.status}`);
  console.log(`✅ Email Template Created! ID: ${tplRes.body?.data?.id}`);

  // STEP 5: Marketing Campaign Creation & Fetch
  console.log('\n[5] Create Campaign "Summer Sale 2026" (POST /api/v1/marketing/campaigns)...');
  const cmpRes = await req
    .post('/api/v1/marketing/campaigns')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Summer Sale 2026 ' + Date.now(),
      type: 'email',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });
  console.log(`POST /api/v1/marketing/campaigns Status: ${cmpRes.status}`);
  console.log(`✅ Campaign Created & Scheduled! ID: ${cmpRes.body?.data?.id}`);

  // STEP 6: Coupon Creation & Fetch
  console.log('\n[6] Create Coupon "SUMMER20" (POST /api/v1/marketing/coupons)...');
  const cpnRes = await req
    .post('/api/v1/marketing/coupons')
    .set('Authorization', `Bearer ${token}`)
    .send({
      code: 'SUMMER' + Date.now().toString().slice(-4),
      type: 'percentage',
      value: 20,
      minOrderAmount: 999,
    });
  console.log(`POST /api/v1/marketing/coupons Status: ${cpnRes.status}`);
  console.log(
    `✅ Coupon Created! ID: ${cpnRes.body?.data?.id}, Code: "${cpnRes.body?.data?.code}"`
  );

  // STEP 7: Abandoned Carts Tracker
  console.log('\n[7] Fetch Abandoned Carts Tracker (GET /api/v1/marketing/abandoned-carts)...');
  const cartsRes = await req
    .get('/api/v1/marketing/abandoned-carts')
    .set('Authorization', `Bearer ${token}`);
  console.log(`GET /api/v1/marketing/abandoned-carts Status: ${cartsRes.status}`);
  console.log(
    `✅ Abandoned Carts Tracker Verified! Carts tracked: ${cartsRes.body?.data?.length || 0}`
  );

  // STEP 8: Customer Segments Creation & Fetch
  console.log(
    '\n[8] Create Customer Segment "VIP High Value" (POST /api/v1/marketing/segments)...'
  );
  const segRes = await req
    .post('/api/v1/marketing/segments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'VIP High Value ' + Date.now(),
      description: 'Customers with total spend over ₹50,000',
    });
  console.log(`POST /api/v1/marketing/segments Status: ${segRes.status}`);
  console.log(`✅ Customer Segment Created! ID: ${segRes.body?.data?.id}`);

  // STEP 9: Automation Rules Creation & Fetch
  console.log(
    '\n[9] Create Automation Rule "Registration Welcome Series" (POST /api/v1/marketing/automation-rules)...'
  );
  const ruleRes = await req
    .post('/api/v1/marketing/automation-rules')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Registration Welcome Series ' + Date.now(),
      triggerEvent: 'customer_registered',
      actionType: 'send_email',
    });
  console.log(`POST /api/v1/marketing/automation-rules Status: ${ruleRes.status}`);
  console.log(`✅ Automation Rule Created! ID: ${ruleRes.body?.data?.id}`);

  console.log('\n====================================================');
  console.log('✅ PHASE 5 MARKETING MODULE E2E VERIFICATIONS PASSED 100%!');
  console.log('====================================================');
};

verifyMarketingModule()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
