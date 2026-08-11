/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';

export async function auditAndMigrateOrphanCustomers(): Promise<{
  totalAudited: number;
  automaticallyMigrated: number;
  manualReviewRequired: number;
  report: any[];
}> {
  const orphanCustomers: any[] = await sequelize.query(
    `SELECT c.id, c.user_id, c.email, c.tenant_id, c.store_id, u.created_at
     FROM customers c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.store_id IS NULL OR c.tenant_id IS NULL OR c.store_id = 0`,
    { type: QueryTypes.SELECT }
  );

  let automaticallyMigrated = 0;
  let manualReviewRequired = 0;
  const report: any[] = [];

  for (const cust of orphanCustomers) {
    // Attempt safe store resolution from orders or active store
    const [orderStore]: any = await sequelize.query(
      `SELECT tenant_id, store_id FROM orders WHERE customer_id = :custId AND store_id IS NOT NULL LIMIT 1`,
      { replacements: { custId: cust.id }, type: QueryTypes.SELECT }
    );

    if (orderStore) {
      await sequelize.query(
        `UPDATE customers SET tenant_id = :tenantId, store_id = :storeId WHERE id = :custId`,
        {
          replacements: {
            tenantId: orderStore.tenant_id,
            storeId: orderStore.store_id,
            custId: cust.id,
          },
        }
      );
      automaticallyMigrated++;
      report.push({
        customerId: cust.id,
        email: cust.email,
        action: 'AUTOMATICALLY_RESOLVED_FROM_ORDER',
        storeId: orderStore.store_id,
      });
    } else {
      manualReviewRequired++;
      report.push({
        customerId: cust.id,
        email: cust.email,
        action: 'MANUAL_REVIEW_REQUIRED',
        reason: 'No prior order store context found',
      });
    }
  }

  return {
    totalAudited: orphanCustomers.length,
    automaticallyMigrated,
    manualReviewRequired,
    report,
  };
}
