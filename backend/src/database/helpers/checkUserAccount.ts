import { connectDatabase } from '../../config/database';
import { User, Customer } from '../models';

export const checkUser = async () => {
  await connectDatabase();

  const email = 'pedapolukarthikroy7@gmail.com';
  console.log(`Checking accounts for email: "${email}"...`);

  const user = await User.findOne({ where: { email } });
  if (user) {
    console.log(`✅ USER RECORD FOUND in 'users' table:`);
    console.log({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      status: user.status,
      passwordHash: user.passwordHash ? '[EXISTS]' : '[MISSING]',
    });
  } else {
    console.log(`❌ NO USER RECORD found in 'users' table for email '${email}'.`);
  }

  const customer = await Customer.findOne({ where: { email } });
  if (customer) {
    console.log(`✅ CUSTOMER RECORD FOUND in 'customers' table:`);
    console.log({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      userId: customer.userId,
    });
  } else {
    console.log(`❌ NO CUSTOMER RECORD found in 'customers' table for email '${email}'.`);
  }

  // Also list all existing users and customers in DB
  const allUsers = await User.findAll({
    attributes: ['id', 'email', 'status', 'tenantId'],
    limit: 10,
  });
  console.log('\n--- Sample Users in Database ---');
  allUsers.forEach((u) =>
    console.log(`User ID ${u.id}: ${u.email} (Tenant: ${u.tenantId}, Status: ${u.status})`)
  );
};

checkUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
