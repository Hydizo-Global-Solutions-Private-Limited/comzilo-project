import { connectDatabase } from '../../config/database';
import { User, Customer, UserRole, Role } from '../models';
import bcrypt from 'bcrypt';

export const seedCustomer = async () => {
  await connectDatabase();

  const email = 'pedapolukarthikroy7@gmail.com';
  const password = 'Password123!';

  console.log(`Seeding customer account for: ${email}...`);

  let user = await User.findOne({ where: { email } });
  if (!user) {
    const { v4: uuidv4 } = require('uuid');
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      tenantId: 1,
      uuid: uuidv4(),
      email,
      passwordHash,
      firstName: 'Pedapolu Karthik',
      lastName: 'Roy',
      status: 'active',
    });
    console.log(`✅ Created User record ID: ${user.id}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await user.update({ passwordHash, status: 'active' });
    console.log(`✅ Updated existing User record ID: ${user.id}`);
  }

  // Ensure Customer record exists
  let customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    customer = await Customer.create({
      tenantId: 1,
      storeId: 1,
      customerCode: 'CUST-1001',
      userId: user.id,
      email,
      firstName: 'Pedapolu Karthik',
      lastName: 'Roy',
      fullName: 'Pedapolu Karthik Roy',
      phone: '+919876543210',
      status: 'active',
    });
    console.log(`✅ Created Customer record ID: ${customer.id}`);
  } else {
    console.log(`✅ Customer record already exists ID: ${customer.id}`);
  }

  // Ensure CUSTOMER role is assigned
  const customerRole = await Role.findOne({ where: { name: 'CUSTOMER' } });
  if (customerRole) {
    const userRoleExists = await UserRole.findOne({
      where: { userId: user.id, roleId: customerRole.id },
    });
    if (!userRoleExists) {
      await UserRole.create({
        tenantId: 1,
        userId: user.id,
        roleId: customerRole.id,
      });
      console.log(`✅ Assigned CUSTOMER role ID ${customerRole.id} to User ID ${user.id}`);
    }
  }

  console.log(`\n🎉 Customer Account Successfully Created / Updated!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
};

seedCustomer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding Error:', err);
    process.exit(1);
  });
