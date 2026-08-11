import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { EmailQueueManager } from './emailQueueManager';
import { logger } from '../shared/logging/logger';

export class SellerBankAccountService {
  private readonly emailQueueManager = new EmailQueueManager();

  private parseTid(tenantId: number | string): number {
    const num = Number(tenantId);
    if (isNaN(num) || num <= 0) return 47;
    return num;
  }

  private async ensureTableExists(): Promise<void> {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS seller_bank_accounts (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          seller_id BIGINT UNSIGNED NULL,
          tenant_id BIGINT UNSIGNED NOT NULL,
          store_id BIGINT UNSIGNED NULL,
          account_holder_name VARCHAR(255) NOT NULL,
          bank_name VARCHAR(255) NOT NULL,
          account_number VARCHAR(100) NOT NULL,
          ifsc_code VARCHAR(50) NOT NULL,
          upi_id VARCHAR(100) NULL,
          pan_number VARCHAR(50) NOT NULL,
          gst_number VARCHAR(50) NULL,
          cancelled_cheque_url TEXT NULL,
          passbook_url TEXT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          remarks TEXT NULL,
          verified_by BIGINT UNSIGNED NULL,
          verified_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e: any) {
      logger.warn('[SellerBankAccountService] Table creation notice:', e.message);
    }
  }

  /**
   * Get Seller Bank Account by Tenant ID
   */
  public async getBankAccount(tenantId: number | string): Promise<any> {
    await this.ensureTableExists();
    const tid = this.parseTid(tenantId);

    try {
      const rows: any = await sequelize.query(
        `SELECT * FROM seller_bank_accounts WHERE tenant_id = :tid ORDER BY id DESC LIMIT 1`,
        { replacements: { tid }, type: QueryTypes.SELECT }
      );
      if (!rows || rows.length === 0) return null;
      return this.mapRow(rows[0]);
    } catch (error: any) {
      logger.error(`[SellerBankAccountService.getBankAccount Failed] ${error.message}`, {
        tid,
        sql: error.sql,
        parameters: { tid },
        code: error.original?.code || error.code,
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Submit or Update Seller Bank Account for Verification
   */
  public async submitBankAccount(tenantId: number | string, data: any): Promise<any> {
    await this.ensureTableExists();
    const tid = this.parseTid(tenantId);

    if (!data.accountHolderName || !data.accountHolderName.trim()) {
      throw new ValidationError('Account Holder Name is required.');
    }
    if (!data.bankName || !data.bankName.trim()) {
      throw new ValidationError('Bank Name is required.');
    }
    if (!data.accountNumber || !data.accountNumber.trim()) {
      throw new ValidationError('Account Number is required.');
    }
    if (!data.ifscCode || !data.ifscCode.trim()) {
      throw new ValidationError('IFSC Code is required.');
    }
    if (!data.panNumber || !data.panNumber.trim()) {
      throw new ValidationError('PAN Number is required.');
    }

    const existing = await this.getBankAccount(tid);

    const accountHolderName = data.accountHolderName.trim();
    const bankName = data.bankName.trim();
    const accountNumber = data.accountNumber.trim();
    const ifscCode = data.ifscCode.trim().toUpperCase();
    const upiId = data.upiId ? data.upiId.trim() : null;
    const panNumber = data.panNumber.trim().toUpperCase();
    const gstNumber = data.gstNumber ? data.gstNumber.trim().toUpperCase() : null;
    const cancelledChequeUrl = data.cancelledChequeUrl || null;
    const passbookUrl = data.passbookUrl || null;

    try {
      if (existing) {
        await sequelize.query(
          `UPDATE seller_bank_accounts 
           SET account_holder_name = :accountHolderName,
               bank_name = :bankName,
               account_number = :accountNumber,
               ifsc_code = :ifscCode,
               upi_id = :upiId,
               pan_number = :panNumber,
               gst_number = :gstNumber,
               cancelled_cheque_url = :cancelledChequeUrl,
               passbook_url = :passbookUrl,
               status = 'PENDING',
               remarks = NULL,
               updated_at = NOW()
           WHERE id = :id`,
          {
            replacements: {
              id: existing.id,
              accountHolderName,
              bankName,
              accountNumber,
              ifscCode,
              upiId,
              panNumber,
              gstNumber,
              cancelledChequeUrl,
              passbookUrl,
            },
            type: QueryTypes.UPDATE,
          }
        );
      } else {
        await sequelize.query(
          `INSERT INTO seller_bank_accounts 
           (tenant_id, seller_id, store_id, account_holder_name, bank_name, account_number, ifsc_code, upi_id, pan_number, gst_number, cancelled_cheque_url, passbook_url, status, created_at, updated_at)
           VALUES
           (:tid, :sellerId, :storeId, :accountHolderName, :bankName, :accountNumber, :ifscCode, :upiId, :panNumber, :gstNumber, :cancelledChequeUrl, :passbookUrl, 'PENDING', NOW(), NOW())`,
          {
            replacements: {
              tid,
              sellerId: data.sellerId || null,
              storeId: data.storeId || null,
              accountHolderName,
              bankName,
              accountNumber,
              ifscCode,
              upiId,
              panNumber,
              gstNumber,
              cancelledChequeUrl,
              passbookUrl,
            },
            type: QueryTypes.INSERT,
          }
        );
      }

      // Queue Notification to Super Admin
      await this.emailQueueManager
        .addJob({
          tenantId: tid,
          triggerEvent: 'admin_bank_verification_requested',
          recipient: 'admin@comzilo.com',
          payload: {
            accountHolder: accountHolderName,
            bankName,
            ifscCode,
          },
        })
        .catch(() => null);

      logger.info(`✅ Bank Account Details Submitted for Tenant #${tid} | Status: PENDING`);
      return this.getBankAccount(tid);
    } catch (error: any) {
      logger.error(`[SellerBankAccountService.submitBankAccount Failed] ${error.message}`, {
        tid,
        sql: error.sql,
        code: error.original?.code || error.code,
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Super Admin: List All Seller Bank Accounts
   */
  public async listAllBankAccounts(params: { status?: string; search?: string }): Promise<any[]> {
    await this.ensureTableExists();

    try {
      let sql = `SELECT * FROM seller_bank_accounts WHERE 1=1 `;
      const replacements: any = {};

      if (params.status && params.status !== 'ALL') {
        sql += ` AND status = :status `;
        replacements.status = params.status;
      }

      if (params.search) {
        sql += ` AND (account_holder_name LIKE :search OR bank_name LIKE :search OR ifsc_code LIKE :search OR pan_number LIKE :search) `;
        replacements.search = `%${params.search}%`;
      }

      sql += ` ORDER BY id DESC `;

      const rows: any = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
      return (rows || []).map((r: any) => this.mapRow(r));
    } catch (error: any) {
      logger.error(`[SellerBankAccountService.listAllBankAccounts Failed] ${error.message}`, {
        sql: error.sql,
        code: error.original?.code || error.code,
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Super Admin: Approve / Reject / Request Changes on Bank Account
   */
  public async verifyBankAccount(
    id: number,
    adminUserId: number,
    status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CHANGES',
    remarks?: string
  ): Promise<any> {
    await this.ensureTableExists();

    try {
      const rows: any = await sequelize.query(`SELECT * FROM seller_bank_accounts WHERE id = :id`, {
        replacements: { id: Number(id) },
        type: QueryTypes.SELECT,
      });
      if (!rows || rows.length === 0) {
        throw new NotFoundError(`Seller Bank Account with ID #${id} not found.`);
      }
      const bankAcc = rows[0];

      if (status === 'REJECTED' && (!remarks || !remarks.trim())) {
        throw new ValidationError(
          'Rejection reason/remarks are required when rejecting a bank account.'
        );
      }

      await sequelize.query(
        `UPDATE seller_bank_accounts 
         SET status = :status, remarks = :remarks, verified_by = :adminUserId, verified_at = NOW(), updated_at = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id: Number(id),
            status,
            remarks: remarks ? remarks.trim() : null,
            adminUserId: Number(adminUserId),
          },
          type: QueryTypes.UPDATE,
        }
      );

      // Trigger Notification
      let eventName = 'seller_bank_approved';
      if (status === 'REJECTED') eventName = 'seller_bank_rejected';
      if (status === 'NEEDS_CHANGES') eventName = 'seller_bank_needs_changes';

      await this.emailQueueManager
        .addJob({
          tenantId: bankAcc.tenant_id,
          triggerEvent: eventName,
          recipient: 'seller@comzilo.com',
          payload: {
            bankName: bankAcc.bank_name,
            status,
            remarks: remarks || 'N/A',
          },
        })
        .catch(() => null);

      logger.info(
        `✅ Bank Account #${id} (Tenant #${bankAcc.tenant_id}) updated to status '${status}' by Admin #${adminUserId}`
      );

      return this.getBankAccount(bankAcc.tenant_id);
    } catch (error: any) {
      logger.error(`[SellerBankAccountService.verifyBankAccount Failed] ${error.message}`, {
        id,
        sql: error.sql,
        code: error.original?.code || error.code,
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  private mapRow(row: any): any {
    return {
      id: Number(row.id),
      sellerId: row.seller_id ? Number(row.seller_id) : null,
      tenantId: Number(row.tenant_id),
      storeId: row.store_id ? Number(row.store_id) : null,
      accountHolderName: row.account_holder_name,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      ifscCode: row.ifsc_code,
      upiId: row.upi_id,
      panNumber: row.pan_number,
      gstNumber: row.gst_number,
      cancelledChequeUrl: row.cancelled_cheque_url,
      passbookUrl: row.passbook_url,
      status: row.status,
      remarks: row.remarks,
      verifiedBy: row.verified_by ? Number(row.verified_by) : null,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
