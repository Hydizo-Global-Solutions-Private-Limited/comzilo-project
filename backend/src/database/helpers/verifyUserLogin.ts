import { connectDatabase } from '../../config/database';
import { User, Customer, UserRole, Role } from '../models';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../app';
import supertest from 'supertest';

export const verifyCredentials = async () => {
  await connectDatabase();

  const email = 'hemanthgannamani@gmail.com';
  const password = 'Hemanth123';

  console.log(`====================================================`);
  console.log(`VERIFYING USER CREDENTIALS FOR: ${email}`);
  console.log(`====================================================`);

  let user = await User.findOne({ where: { email } });
  if (!user) {
    console.log(
      `⚠️ User record not found. Creating user account with email "${email}" and password "${password}"...`
    );
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      tenantId: 1,
      uuid: uuidv4(),
      email,
      passwordHash,
      firstName: 'hemanth',
      lastName: 'gannamani',
      status: 'active',
    });
    console.log(`✅ User record created! ID: ${user.id}`);
  } else {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`User ID ${user.id} found in DB. Password hash match result: ${isMatch}`);
    if (!isMatch) {
      console.log(`Updating user password hash to match "${password}"...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await user.update({ passwordHash, status: 'active' });
      console.log(`✅ User password hash updated!`);
    }
  }

  // Ensure Customer record exists
  let customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    customer = await Customer.create({
      tenantId: 1,
      storeId: 1,
      customerCode: 'CUST-' + Date.now().toString().slice(-6),
      userId: user.id,
      email,
      firstName: 'hemanth',
      lastName: 'gannamani',
      fullName: 'hemanth gannamani',
      phone: '+91' + Date.now().toString().slice(-10),
      status: 'active',
    });
    console.log(`✅ Customer record created! ID: ${customer.id}`);
  }

  // Ensure Customer Role is assigned
  const customerRole = await Role.findOne({ where: { name: 'CUSTOMER' } });
  if (customerRole) {
    const roleAssigned = await UserRole.findOne({
      where: { userId: user.id, roleId: customerRole.id },
    });
    if (!roleAssigned) {
      await UserRole.create({ tenantId: 1, userId: user.id, roleId: customerRole.id });
      console.log(`✅ CUSTOMER role assigned to User ID ${user.id}`);
    }
  }

  // Test Authentication via API
  console.log(`\nTesting HTTP POST /api/v1/auth/login with exact credentials...`);
  const req = supertest(app);
  const loginRes = await req.post('/api/v1/auth/login').send({ email, password });

  console.log(`HTTP Login Status: ${loginRes.status}`);
  if (loginRes.status === 200) {
    console.log(`🎉 API LOGIN SUCCESSFUL!`);
    console.log(`User UUID: ${loginRes.body?.data?.user?.uuid}`);
    console.log(`User Email: ${loginRes.body?.data?.user?.email}`);
    console.log(`Access Token: ${loginRes.body?.data?.accessToken ? '[TOKEN VALID]' : '[NONE]'}`);
  } else {
    console.error(`❌ API LOGIN FAILED:`, JSON.stringify(loginRes.body));
  }
};

verifyCredentials()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
