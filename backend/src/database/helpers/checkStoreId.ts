import { connectDatabase } from '../../config/database';
import { Product, Store } from '../models';

export const checkStores = async () => {
  await connectDatabase();

  const stores = await Store.findAll();
  console.log('Stores in database:');
  stores.forEach((s) =>
    console.log(` - ID: ${s.id}, Name: ${s.name}, Tenant: ${s.tenantId}, Status: ${s.status}`)
  );

  const products = await Product.findAll({
    attributes: ['id', 'storeId', 'tenantId', 'name', 'productType', 'status'],
  });
  console.log(`\nTotal products in database: ${products.length}`);
  const storeCounts: Record<number, number> = {};
  products.forEach((p) => {
    storeCounts[p.storeId] = (storeCounts[p.storeId] || 0) + 1;
  });
  console.log('Products grouped by storeId:', storeCounts);
};

checkStores()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
