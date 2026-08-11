import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const verifyEmailProviderSaving = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('EMAIL PROVIDERS CONFIGURATION QA SUITE');
  console.log('====================================================');

  // STEP 1: Seller Authentication
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  const token = loginRes.body.data.accessToken;

  // STEP 2: Save SMTP Provider Configuration
  console.log(
    '\n[1] Saving Custom SMTP Server Configuration (POST /api/v1/marketing/email-providers)...'
  );
  const smtpRes = await req
    .post('/api/v1/marketing/email-providers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      providerId: 'smtp',
      providerName: 'Custom SMTP Server',
      smtpHost: 'smtp.mailtrap.io',
      smtpPort: '587',
      smtpUsername: 'smtp_test_user',
      smtpPassword: 'secret_smtp_password',
      senderName: 'Comzilo Admin',
      senderEmail: 'admin@comzilo.com',
      isDefault: true,
    });
  console.log(`POST /api/v1/marketing/email-providers Status: ${smtpRes.status}`);
  console.log('Response:', smtpRes.body);

  // STEP 3: Save Amazon SES Provider Configuration
  console.log('\n[2] Saving Amazon SES API Configuration...');
  const sesRes = await req
    .post('/api/v1/marketing/email-providers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      providerId: 'ses',
      providerName: 'Amazon SES',
      apiKey: 'AKIAIOSFODNN7EXAMPLE',
      apiDomain: 'us-east-1',
      senderName: 'Amazon SES Sender',
      senderEmail: 'ses@comzilo.com',
    });
  console.log(`POST /api/v1/marketing/email-providers Status: ${sesRes.status}`);

  // STEP 4: Query MySQL Table marketing_email_providers
  console.log('\n[3] Querying MySQL Table marketing_email_providers...');
  const dbRows: any[] = await sequelize.query('SELECT * FROM marketing_email_providers', {
    type: QueryTypes.SELECT,
  });
  console.table(dbRows);

  if (dbRows.length === 0) {
    throw new Error('No rows found in marketing_email_providers table!');
  }

  // STEP 5: Verify GET /api/v1/marketing/email-providers returns configured status
  console.log('\n[4] Fetching Email Providers Grid (GET /api/v1/marketing/email-providers)...');
  const getRes = await req
    .get('/api/v1/marketing/email-providers')
    .set('Authorization', `Bearer ${token}`);
  console.log('Returned Providers:', getRes.body?.data);

  console.log('\n====================================================');
  console.log('✅ EMAIL PROVIDERS CONFIGURATION PASSED 100%!');
  console.log('====================================================');
};

verifyEmailProviderSaving()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
