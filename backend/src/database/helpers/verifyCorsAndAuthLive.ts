/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';

export const verifyCorsAndAuth = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('CORS & PREFLIGHT DIAGNOSTIC TRACE');
  console.log('====================================================');

  // STEP 1: Test OPTIONS Preflight Request with all frontend headers
  console.log('\n[1] Testing OPTIONS Preflight Request...');
  const optionsRes = await req
    .options('/api/v1/marketing/email-templates')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'GET')
    .set(
      'Access-Control-Request-Headers',
      'content-type,authorization,x-tenant-id,x-tenant-uuid,x-store-id'
    );

  console.log('OPTIONS Status Code:', optionsRes.status);
  console.log('Access-Control-Allow-Origin:', optionsRes.headers['access-control-allow-origin']);
  console.log('Access-Control-Allow-Headers:', optionsRes.headers['access-control-allow-headers']);

  if (optionsRes.status !== 204 && optionsRes.status !== 200) {
    throw new Error(`OPTIONS preflight failed with status ${optionsRes.status}`);
  }

  // STEP 2: Login and test GET /email-templates
  console.log('\n[2] Logging in as admin@comzilo.com...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  const token = loginRes.body.data.accessToken;

  console.log('\n[3] Testing GET /api/v1/marketing/email-templates with token...');
  const getTemplatesRes = await req
    .get('/api/v1/marketing/email-templates')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Tenant-ID', '1')
    .set('X-Store-ID', '1');

  console.log('GET /email-templates Status:', getTemplatesRes.status);
  console.log('Response Body:', getTemplatesRes.body);

  if (getTemplatesRes.status !== 200) {
    throw new Error(`GET /email-templates failed with status ${getTemplatesRes.status}`);
  }

  console.log('\n[4] Testing GET /api/v1/marketing/email-providers with token...');
  const getProvidersRes = await req
    .get('/api/v1/marketing/email-providers')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Tenant-ID', '1')
    .set('X-Store-ID', '1');

  console.log('GET /email-providers Status:', getProvidersRes.status);

  if (getProvidersRes.status !== 200) {
    throw new Error(`GET /email-providers failed with status ${getProvidersRes.status}`);
  }

  console.log('\n====================================================');
  console.log('✅ ALL CORS & API PREFLIGHT CHECKS PASSED 100%!');
  console.log('====================================================');
};

verifyCorsAndAuth()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('DIAGNOSTIC FAILURE:', err);
    process.exit(1);
  });
