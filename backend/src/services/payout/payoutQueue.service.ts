/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { PayoutProviderFactory } from './payoutProvider.factory';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';

export class PayoutQueueService {
  private async ensurePayoutTablesExist(): Promise<void> {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payout_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        withdrawal_id INT NOT NULL,
        tenant_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        mode VARCHAR(20) NOT NULL DEFAULT 'IMPS',
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 3,
        error_message TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payout_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        payout_number VARCHAR(50) NOT NULL UNIQUE,
        withdrawal_id INT NOT NULL,
        tenant_id INT NOT NULL,
        razorpay_payout_id VARCHAR(100) NULL,
        fund_account_id VARCHAR(100) NULL,
        contact_id VARCHAR(100) NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        mode VARCHAR(20) NOT NULL DEFAULT 'IMPS',
        purpose VARCHAR(50) NOT NULL DEFAULT 'payout',
        status VARCHAR(30) NOT NULL DEFAULT 'processing',
        utr VARCHAR(100) NULL,
        failure_reason TEXT NULL,
        provider VARCHAR(30) NOT NULL DEFAULT 'MOCK',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payout_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payout_id INT NULL,
        withdrawal_id INT NULL,
        action VARCHAR(50) NOT NULL,
        request_payload JSON NULL,
        response_payload JSON NULL,
        status_code INT NULL DEFAULT 200,
        execution_time_ms INT NULL DEFAULT 0,
        provider VARCHAR(30) NOT NULL DEFAULT 'MOCK',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  /**
   * Log an API action to payout_logs table
   */
  public async logPayoutAction(
    action: string,
    withdrawalId?: number,
    payoutId?: number,
    reqPayload?: any,
    resPayload?: any,
    statusCode = 200,
    executionTimeMs = 0,
    provider = 'MOCK'
  ): Promise<void> {
    await this.ensurePayoutTablesExist();
    await sequelize.query(
      `INSERT INTO payout_logs 
        (withdrawal_id, payout_id, action, request_payload, response_payload, status_code, execution_time_ms, provider, created_at)
       VALUES 
        (:withdrawalId, :payoutId, :action, :reqPayload, :resPayload, :statusCode, :executionTimeMs, :provider, NOW())`,
      {
        replacements: {
          withdrawalId: withdrawalId || null,
          payoutId: payoutId || null,
          action,
          reqPayload: reqPayload ? JSON.stringify(reqPayload) : null,
          resPayload: resPayload ? JSON.stringify(resPayload) : null,
          statusCode,
          executionTimeMs,
          provider,
        },
        type: QueryTypes.INSERT,
      }
    );
  }

  /**
   * Enqueue a withdrawal request into payout_queue
   */
  public async enqueuePayout(withdrawalId: number): Promise<any> {
    await this.ensurePayoutTablesExist();

    const [withdrawal]: any = await sequelize.query(
      `SELECT * FROM seller_withdrawals WHERE id = :withdrawalId LIMIT 1`,
      { replacements: { withdrawalId }, type: QueryTypes.SELECT }
    );

    if (!withdrawal) {
      throw new NotFoundError(`Withdrawal request #${withdrawalId} not found.`);
    }

    // Check if already in queue
    const [existingQueue]: any = await sequelize.query(
      `SELECT * FROM payout_queue WHERE withdrawal_id = :withdrawalId AND status IN ('queued', 'processing') LIMIT 1`,
      { replacements: { withdrawalId }, type: QueryTypes.SELECT }
    );

    if (existingQueue) {
      return existingQueue;
    }

    const queueUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO payout_queue 
        (uuid, withdrawal_id, tenant_id, amount, mode, status, attempts, created_at, updated_at)
       VALUES 
        (:uuid, :withdrawalId, :tenantId, :amount, 'IMPS', 'queued', 0, NOW(), NOW())`,
      {
        replacements: {
          uuid: queueUuid,
          withdrawalId,
          tenantId: withdrawal.tenant_id,
          amount: withdrawal.amount,
        },
        type: QueryTypes.INSERT,
      }
    );

    await this.logPayoutAction(
      'PAYOUT_ENQUEUED',
      withdrawalId,
      undefined,
      { withdrawalId, amount: withdrawal.amount },
      { queueUuid, status: 'queued' }
    );

    // Auto-process queue immediately
    setImmediate(() => {
      this.processQueue().catch((err) =>
        console.error('[PayoutQueueWorker] Processing Error:', err)
      );
    });

    const [queuedItem]: any = await sequelize.query(
      `SELECT * FROM payout_queue WHERE uuid = :uuid LIMIT 1`,
      { replacements: { uuid: queueUuid }, type: QueryTypes.SELECT }
    );

    return queuedItem;
  }

  /**
   * Process all queued payouts using provider abstraction
   */
  public async processQueue(): Promise<{ processedCount: number; errors: any[] }> {
    await this.ensurePayoutTablesExist();

    const queuedItems: any = await sequelize.query(
      `SELECT q.*, w.bank_name, w.account_number, w.ifsc_code, w.account_holder_name, w.withdrawal_number, t.name as seller_name
       FROM payout_queue q
       JOIN seller_withdrawals w ON q.withdrawal_id = w.id
       LEFT JOIN tenants t ON q.tenant_id = t.id
       WHERE q.status = 'queued' AND q.attempts < q.max_attempts
       ORDER BY q.id ASC LIMIT 20`,
      { type: QueryTypes.SELECT }
    );

    let processedCount = 0;
    const errors: any[] = [];

    const provider = PayoutProviderFactory.getProvider();

    for (const item of queuedItems) {
      const startTime = Date.now();
      try {
        // Mark status = processing
        await sequelize.query(
          `UPDATE payout_queue SET status = 'processing', attempts = attempts + 1, updated_at = NOW() WHERE id = :id`,
          { replacements: { id: item.id }, type: QueryTypes.UPDATE }
        );

        // 1. Create Contact
        const contactRes = await provider.createContact({
          name: item.account_holder_name || item.seller_name || `Tenant #${item.tenant_id}`,
          email: `seller${item.tenant_id}@comzilo.com`,
          contact: '+919988776655',
          type: 'vendor',
          reference_id: `TENANT_${item.tenant_id}`,
        });

        // 2. Create Fund Account
        const fundRes = await provider.createFundAccount({
          contact_id: contactRes.id,
          account_type: 'bank_account',
          bank_account: {
            name: item.account_holder_name || item.seller_name || 'Merchant Account',
            ifsc: item.ifsc_code || 'HDFC0001234',
            account_number: item.account_number || '998877665544',
          },
        });

        // 3. Initiate Payout
        const payoutNum = `PO-${Date.now().toString().slice(-6)}`;
        const payoutRes = await provider.initiatePayout({
          account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '2334455667788',
          fund_account_id: fundRes.id,
          amount: Number(item.amount),
          currency: 'INR',
          mode: 'IMPS',
          purpose: 'payout',
          reference_id: item.withdrawal_number || payoutNum,
          narration: `Comzilo Payout ${payoutNum}`,
        });

        const executionTime = Date.now() - startTime;

        // 4. Save to Payout History
        const payoutUuid = uuidv4();
        await sequelize.query(
          `INSERT INTO payout_history 
            (uuid, payout_number, withdrawal_id, tenant_id, razorpay_payout_id, fund_account_id, contact_id, amount, currency, mode, purpose, status, utr, provider, created_at, updated_at)
           VALUES 
            (:uuid, :payoutNum, :withdrawalId, :tenantId, :payoutId, :fundAccountId, :contactId, :amount, 'INR', 'IMPS', 'payout', :status, :utr, :provider, NOW(), NOW())`,
          {
            replacements: {
              uuid: payoutUuid,
              payoutNum,
              withdrawalId: item.withdrawal_id,
              tenantId: item.tenant_id,
              payoutId: payoutRes.id,
              fundAccountId: fundRes.id,
              contactId: contactRes.id,
              amount: item.amount,
              status: payoutRes.status || 'processed',
              utr: payoutRes.utr || `UTR_${Date.now()}`,
              provider: provider.providerName,
            },
            type: QueryTypes.INSERT,
          }
        );

        // 5. Update seller_withdrawals to paid
        await sequelize.query(
          `UPDATE seller_withdrawals 
           SET status = 'paid', payout_reference = :payoutRef, processed_at = NOW(), updated_at = NOW() 
           WHERE id = :withdrawalId`,
          {
            replacements: {
              withdrawalId: item.withdrawal_id,
              payoutRef: payoutRes.utr || payoutRes.id,
            },
            type: QueryTypes.UPDATE,
          }
        );

        // 6. Update payout_queue status to processed
        await sequelize.query(
          `UPDATE payout_queue SET status = 'processed', updated_at = NOW() WHERE id = :id`,
          { replacements: { id: item.id }, type: QueryTypes.UPDATE }
        );

        // 7. Log Action
        await this.logPayoutAction(
          'PAYOUT_PROCESSED_SUCCESS',
          item.withdrawal_id,
          undefined,
          { queueId: item.id, withdrawalId: item.withdrawal_id, amount: item.amount },
          payoutRes,
          200,
          executionTime,
          provider.providerName
        );

        processedCount++;
      } catch (err: any) {
        const executionTime = Date.now() - startTime;
        const errMsg = err.message || 'Payout process error';
        errors.push({ queueId: item.id, error: errMsg });

        await sequelize.query(
          `UPDATE payout_queue SET status = 'failed', error_message = :errMsg, updated_at = NOW() WHERE id = :id`,
          { replacements: { id: item.id, errMsg }, type: QueryTypes.UPDATE }
        );

        await this.logPayoutAction(
          'PAYOUT_PROCESSED_FAILED',
          item.withdrawal_id,
          undefined,
          { queueId: item.id },
          { error: errMsg },
          500,
          executionTime,
          provider.providerName
        );
      }
    }

    return { processedCount, errors };
  }

  /**
   * Get Active Payout Queue
   */
  public async getPayoutQueue(): Promise<any[]> {
    await this.ensurePayoutTablesExist();
    return await sequelize.query(
      `SELECT q.*, w.withdrawal_number, w.bank_name, w.account_number, t.name as seller_name 
       FROM payout_queue q
       LEFT JOIN seller_withdrawals w ON q.withdrawal_id = w.id
       LEFT JOIN tenants t ON q.tenant_id = t.id
       ORDER BY q.id DESC LIMIT 100`,
      { type: QueryTypes.SELECT }
    );
  }

  /**
   * Get Payout History & Statuses
   */
  public async getPayoutHistory(): Promise<any[]> {
    await this.ensurePayoutTablesExist();
    return await sequelize.query(
      `SELECT h.*, t.name as seller_name 
       FROM payout_history h
       LEFT JOIN tenants t ON h.tenant_id = t.id
       ORDER BY h.id DESC LIMIT 100`,
      { type: QueryTypes.SELECT }
    );
  }

  /**
   * Get Payout Audit Logs
   */
  public async getPayoutLogs(): Promise<any[]> {
    await this.ensurePayoutTablesExist();
    return await sequelize.query(`SELECT * FROM payout_logs ORDER BY id DESC LIMIT 100`, {
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Get Single Payout Status
   */
  public async getPayoutStatus(payoutId: string): Promise<any> {
    await this.ensurePayoutTablesExist();

    const [payout]: any = await sequelize.query(
      `SELECT * FROM payout_history WHERE razorpay_payout_id = :payoutId OR id = :payoutId LIMIT 1`,
      { replacements: { payoutId }, type: QueryTypes.SELECT }
    );

    if (!payout) {
      throw new NotFoundError(`Payout record ${payoutId} not found.`);
    }

    return payout;
  }

  /**
   * Webhook Processor for Razorpay Payout Events
   */
  public async handleWebhook(event: string, payload: any): Promise<any> {
    await this.ensurePayoutTablesExist();

    const payoutEntity = payload?.contains?.includes('payout')
      ? payload?.payload?.payout?.entity
      : payload;
    const rzpPayoutId = payoutEntity?.id;
    const status = payoutEntity?.status || 'processed';
    const utr = payoutEntity?.utr;

    if (rzpPayoutId) {
      await sequelize.query(
        `UPDATE payout_history 
         SET status = :status, utr = COALESCE(:utr, utr), updated_at = NOW() 
         WHERE razorpay_payout_id = :rzpPayoutId`,
        { replacements: { status, utr: utr || null, rzpPayoutId }, type: QueryTypes.UPDATE }
      );
    }

    await this.logPayoutAction(
      `WEBHOOK_${event?.toUpperCase()?.replace(/[^A-Z0-9]/g, '_') || 'EVENT'}`,
      undefined,
      undefined,
      { event },
      payload,
      200,
      0,
      'RAZORPAY'
    );

    return { received: true, event, rzpPayoutId, status };
  }
}
