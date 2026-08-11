import { connectDatabase } from '../../config/database';
import app from '../../app';
import supertest from 'supertest';
import { User, Tenant, Store, SellerApplication } from '../models';
import { logger } from '../../shared/logging/logger';

export const runSellerLoginFlowVerify = async () => {
  try {
    await connectDatabase();

    logger.info('=== STEP 1: ADMIN LOGIN ===');
    const adminLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'admin@comzilo.com', password: 'SuperAdminSecurePassword2026!' });

    if (adminLoginRes.status !== 200) {
      logger.error('Admin login failed:', adminLoginRes.body);
      throw new Error('Admin login failed');
    }
    const adminToken = adminLoginRes.body.data.accessToken;
    logger.info('✓ Admin login successful.');

    logger.info('=== STEP 2: SUBMIT SELLER APPLICATION ===');
    const timestamp = Date.now();
    const sellerEmail = `test.seller.${timestamp}@example.com`;
    const sellerPhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const businessName = `Auto Test Store ${timestamp}`;
    const gstNumber = `36AABCS${Math.floor(1000 + Math.random() * 9000)}F1Z5`;

    const submitRes = await supertest(app)
      .post('/api/v1/seller-applications')
      .send({
        ownerName: 'Test Seller Owner',
        email: sellerEmail,
        phone: sellerPhone,
        password: 'ApplicantPassword2026!',
        confirmPassword: 'ApplicantPassword2026!',
        businessName,
        businessType: 'Retail',
        gstNumber,
        panNumber: 'ABCDE1234F',
        addressLine1: '123 Business St',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        postalCode: '500001',
        preferredStoreName: `${businessName} Store`,
        license:
          'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDMwVDAwVLC0sDQyM1EwMjVTMEszVDBKtDSxMDBLNTRTME4zUjAxUzC1NE1NskwyMTA0TEtKNEyzNExNTDE1skwzNjMxNTA0N000TDFNTEw0NjYyT7S0S0yyNEg0MzExM1MwVzC2NDNUt7QAAEY3Ge0KZW5kc3RyZWFtCmVuZG9iagozIDAgb2JqCjgxCmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgNCAwIFIvUmVzb3VyY2VzIDUgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXS9Db250ZW50cyAyIDAgUj4+CmVuZG9iago1IDAgb2JqCjw8L1Byb2NTZXRbL1BERi9UZXh0L0ltYWdlQi9JbWFnZUMvSW1hZ2VJXT4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1sxIDAgUl0vQ291bnQgMT4+CmVuZG9iago2IDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYXJlbnQgNCAwIFI+PgpzdGFydHhyZWYKMjg4CiUlRU9GCg==',
        identityProof:
          'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDMwVDAwVLC0sDQyM1EwMjVTMEszVDBKtDSxMDBLNTRTME4zUjAxUzC1NE1NskwyMTA0TEtKNEyzNExNTDE1skwzNjMxNTA0N000TDFNTEw0NjYyT7S0S0yyNEg0MzExM1MwVzC2NDNUt7QAAEY3Ge0KZW5kc3RyZWFtCmVuZG9iagozIDAgb2JqCjgxCmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgNCAwIFIvUmVzb3VyY2VzIDUgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXS9Db250ZW50cyAyIDAgUj4+CmVuZG9iago1IDAgb2JqCjw8L1Byb2NTZXRbL1BERi9UZXh0L0ltYWdlQi9JbWFnZUMvSW1hZ2VJXT4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1sxIDAgUl0vQ291bnQgMT4+CmVuZG9iago2IDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYXJlbnQgNCAwIFI+PgpzdGFydHhyZWYKMjg4CiUlRU9GCg==',
      });

    if (submitRes.status !== 201) {
      logger.error('Seller application submission failed:', submitRes.body);
      throw new Error('Seller application submission failed');
    }
    const appRecord = await SellerApplication.findOne({ where: { email: sellerEmail } });
    if (!appRecord) throw new Error('Seller application not found in database');
    logger.info(`✓ Seller application submitted successfully. ID: ${appRecord.id}`);

    logger.info('=== STEP 3: APPROVE SELLER APPLICATION ===');
    const approveRes = await supertest(app)
      .patch(`/api/v1/admin/seller-applications/${appRecord.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-UUID', '00000000-0000-0000-0000-000000000001');

    if (approveRes.status !== 200) {
      logger.error('Approve application failed:', approveRes.body);
      throw new Error('Approve application failed');
    }

    const { credentials } = approveRes.body.data;
    const tempPassword = credentials.temporaryPassword;
    logger.info(`✓ Seller approved! Temporary Password displayed: ${tempPassword}`);

    logger.info('=== STEP 4: VERIFY DATABASE PROVISIONING ===');
    const dbUser = await User.findOne({ where: { email: sellerEmail } });
    if (!dbUser) throw new Error('Provisioned seller user not found in DB');
    const dbTenant = await Tenant.findByPk(dbUser.tenantId);
    if (!dbTenant) throw new Error('Provisioned tenant not found in DB');
    const dbStore = await Store.findOne({ where: { tenantId: dbUser.tenantId } });
    if (!dbStore) throw new Error('Provisioned store not found in DB');

    logger.info(
      `✓ Provisioned User ID: ${dbUser.id} | Tenant ID: ${dbUser.tenantId} (${dbTenant.name}) | Store ID: ${dbStore.id} (${dbStore.name})`
    );
    logger.info(`✓ mustChangePassword: ${dbUser.mustChangePassword} | status: ${dbUser.status}`);

    logger.info('=== STEP 5: SELLER LOGIN USING TEMPORARY PASSWORD (WITHOUT TENANT HEADER) ===');
    // Notice: NO X-Tenant-UUID header is passed here! tenantResolver MUST resolve tenant via email lookup.
    const sellerLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({ email: sellerEmail, password: tempPassword });

    if (sellerLoginRes.status !== 200) {
      logger.error('Seller login failed:', sellerLoginRes.body);
      throw new Error('Seller login with temporary password failed!');
    }

    const sellerToken = sellerLoginRes.body.data.accessToken;
    const loginUser = sellerLoginRes.body.data.user;
    const loginTenant = sellerLoginRes.body.data.tenant;
    logger.info('✓ Seller Login SUCCESSFUL!');
    logger.info(
      `✓ Authenticated User UUID: ${loginUser.uuid} | mustChangePassword: ${loginUser.mustChangePassword}`
    );
    logger.info(`✓ Authenticated Tenant Slug: ${loginTenant.slug} | Name: ${loginTenant.name}`);

    logger.info('=== STEP 6: FORCE CHANGE PASSWORD ===');
    const newPassword = 'NewSecureSellerPassword2026!';
    const changePassRes = await supertest(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ currentPassword: tempPassword, newPassword });

    if (changePassRes.status !== 200) {
      logger.error('Change password failed:', changePassRes.body);
      throw new Error('Change password failed');
    }
    logger.info('✓ Password changed successfully.');

    logger.info('=== STEP 7: VERIFY PROFILE & SELLER DASHBOARD ACCESS ===');
    const meRes = await supertest(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sellerToken}`);

    if (meRes.status !== 200) {
      logger.error('Fetch profile failed:', meRes.body);
      throw new Error('Fetch profile failed');
    }
    logger.info(`✓ Profile retrieved. mustChangePassword: ${meRes.body.data.mustChangePassword}`);

    logger.info('=== STEP 8: LOGIN WITH NEW PASSWORD ===');
    const newLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({ email: sellerEmail, password: newPassword });

    if (newLoginRes.status !== 200) {
      logger.error('Login with new password failed:', newLoginRes.body);
      throw new Error('Login with new password failed');
    }
    logger.info('✓ Login with new password SUCCESSFUL!');

    logger.info('=== STEP 9: OLD TEMPORARY PASSWORD REJECTED ===');
    const oldLoginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({ email: sellerEmail, password: tempPassword });

    if (oldLoginRes.status !== 401) {
      throw new Error(`Old password expected 401, got ${oldLoginRes.status}`);
    }
    logger.info('✓ Old temporary password correctly rejected (401 Unauthorized).');

    logger.info('🎉 === ALL 10 STEPS OF SELLER LOGIN FLOW VERIFIED SUCCESSFULLY === 🎉');
  } catch (error) {
    logger.error('Seller login flow verification failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runSellerLoginFlowVerify().then(() => process.exit(0));
}
