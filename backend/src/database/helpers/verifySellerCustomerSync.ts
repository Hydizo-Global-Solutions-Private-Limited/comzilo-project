import { connectDatabase, sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';

export const runDatabaseAudit = async () => {
  await connectDatabase();

  console.log('====================================================');
  console.log('STEP 2 - DATABASE VERIFICATION & AUDIT QUERIES');
  console.log('====================================================');

  console.log(
    '\n[Query 1] Executing SELECT id, tenant_id, store_id, name, product_type, status, visibility FROM products ORDER BY id DESC;'
  );
  const productsList: any[] = await sequelize.query(
    `SELECT id, tenant_id, store_id, name, product_type, status, visibility FROM products ORDER BY id DESC LIMIT 20`,
    { type: QueryTypes.SELECT }
  );

  console.table(productsList);

  console.log(
    '\n[Query 2] Executing SELECT product_type, COUNT(*) FROM products GROUP BY product_type;'
  );
  const typeCounts: any[] = await sequelize.query(
    `SELECT product_type, COUNT(*) as count FROM products GROUP BY product_type`,
    { type: QueryTypes.SELECT }
  );

  console.table(typeCounts);

  console.log('\n[Check Stores] Executing SELECT id, tenant_id, name, status FROM stores;');
  const storesList: any[] = await sequelize.query(
    `SELECT id, tenant_id, name, status FROM stores`,
    { type: QueryTypes.SELECT }
  );
  console.table(storesList);
};

runDatabaseAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
