import { connectDatabase } from '../../config/database';
import { User, Customer, Order, OrderItem, Invoice, Payment } from '../models';

export const seedOrdersForVikas = async () => {
  await connectDatabase();

  const email = 'maddipativikas130@gmail.com';
  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  let customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    customer = await Customer.create({
      tenantId: 1,
      storeId: 1,
      customerCode: `CUST-${Date.now().toString().slice(-6)}`,
      userId: user.id,
      email: user.email,
      firstName: user.firstName || 'Abhay',
      lastName: user.lastName || 'Ram',
      fullName: `${user.firstName || 'Abhay'} ${user.lastName || 'Ram'}`.trim(),
      phone: '+91 98765 43210',
      status: 'active',
    });
  }

  const existingOrders = await Order.findAll({ where: { customerId: customer.id } });
  if (existingOrders.length === 0) {
    const o1 = await Order.create({
      tenantId: 1,
      storeId: 1,
      customerId: customer.id,
      createdBy: user.id,
      orderNumber: 'ORD-982341',
      orderStatus: 'completed',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      currency: 'INR',
      totalAmount: 2679.0,
      placedAt: new Date(Date.now() - 86400000 * 2),
    } as any);

    const o2 = await Order.create({
      tenantId: 1,
      storeId: 1,
      customerId: customer.id,
      createdBy: user.id,
      orderNumber: 'ORD-982342',
      orderStatus: 'completed',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      currency: 'INR',
      totalAmount: 1499.0,
      placedAt: new Date(Date.now() - 86400000 * 5),
    } as any);

    await Invoice.create({
      tenantId: 1,
      storeId: 1,
      orderId: o1.id,
      invoiceNumber: 'INV-982341-2026',
      subtotal: 2499.0,
      tax: 180.0,
      discount: 0,
      total: 2679.0,
      invoiceStatus: 'paid',
      issuedAt: new Date(Date.now() - 86400000 * 2),
    } as any);

    await Invoice.create({
      tenantId: 1,
      storeId: 1,
      orderId: o2.id,
      invoiceNumber: 'INV-982342-2026',
      subtotal: 1399.0,
      tax: 100.0,
      discount: 0,
      total: 1499.0,
      invoiceStatus: 'paid',
      issuedAt: new Date(Date.now() - 86400000 * 5),
    } as any);

    await Payment.create({
      tenantId: 1,
      storeId: 1,
      orderId: o1.id,
      paymentNumber: 'PAY-982341',
      paymentMethod: 'razorpay',
      gateway: 'razorpay',
      amount: 2679.0,
      currency: 'INR',
      paymentStatus: 'paid',
      transactionReference: 'pay_Nz982341x9a',
      paidAt: new Date(Date.now() - 86400000 * 2),
    } as any);

    await Payment.create({
      tenantId: 1,
      storeId: 1,
      orderId: o2.id,
      paymentNumber: 'PAY-982342',
      paymentMethod: 'razorpay',
      gateway: 'razorpay',
      amount: 1499.0,
      currency: 'INR',
      paymentStatus: 'paid',
      transactionReference: 'pay_Nz982342x9b',
      paidAt: new Date(Date.now() - 86400000 * 5),
    } as any);

    console.log(`✅ Seeded 2 orders, invoices, and payments for ${email}`);
  } else {
    console.log(`Orders already exist for ${email}`);
  }
};

seedOrdersForVikas()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
