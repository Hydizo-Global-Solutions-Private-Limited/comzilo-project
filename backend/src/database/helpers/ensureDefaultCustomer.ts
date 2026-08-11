import { connectDatabase } from '../../config/database';
import { User, Customer, UserRole, Role } from '../models';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const ensureDefaultCustomer = async () => {
  await connectDatabase();

  const email = 'customer@example.com';
  const password = 'password123';

  let user = await User.findOne({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      tenantId: 1,
      uuid: uuidv4(),
      email,
      passwordHash,
      firstName: 'Customer',
      lastName: 'Demo',
      status: 'active',
    });
    console.log(`✅ Default demo customer user created: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await user.update({ passwordHash, status: 'active' });
    console.log(`✅ Default demo customer password reset to: ${password}`);
  }

  const customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    await Customer.create({
      tenantId: 1,
      storeId: 1,
      customerCode: 'CUST-DEMO',
      userId: user.id,
      email,
      firstName: 'Customer',
      lastName: 'Demo',
      fullName: 'Customer Demo',
      phone: '+919999999999',
      status: 'active',
    });
    console.log(`✅ Default demo Customer record created`);
  }

  const customerRole = await Role.findOne({ where: { name: 'CUSTOMER' } });
  if (customerRole) {
    const exists = await UserRole.findOne({ where: { userId: user.id, roleId: customerRole.id } });
    if (!exists) {
      await UserRole.create({ tenantId: 1, userId: user.id, roleId: customerRole.id });
    }
  }
};

ensureDefaultCustomer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
