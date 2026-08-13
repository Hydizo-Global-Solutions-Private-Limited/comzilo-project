import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError } from '../shared/errors/AppError';
import { logger } from '../shared/logging/logger';
import { CommissionEngineService } from './commissionEngine.service';

export class SellerWalletService {
  /**
   * Ensure wallet table structure exists
   */
  public async ensureWalletTablesExist(): Promise<void> {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS seller_wallets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uuid VARCHAR(36) NOT NULL UNIQUE,
          tenant_id INT NOT NULL,
          store_id INT NOT NULL DEFAULT 1,
          total_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          available_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          currency VARCHAR(10) NOT NULL DEFAULT 'INR',
          bank_name VARCHAR(100) NULL,
          account_number VARCHAR(50) NULL,
          ifsc_code VARCHAR(20) NULL,
          account_holder_name VARCHAR(100) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_seller_wallets_tenant (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS seller_wallet_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uuid VARCHAR(36) NOT NULL UNIQUE,
          tenant_id INT NOT NULL,
          store_id INT NOT NULL DEFAULT 1,
          wallet_id INT NOT NULL,
          order_id INT NULL,
          withdrawal_id INT NULL,
          transaction_number VARCHAR(50) NOT NULL UNIQUE,
          type VARCHAR(30) NOT NULL,
          amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          description TEXT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'completed',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_seller_w_tx_tenant (tenant_id),
          INDEX idx_seller_w_tx_wallet (wallet_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS seller_withdrawals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uuid VARCHAR(36) NOT NULL UNIQUE,
          tenant_id INT NOT NULL,
          store_id INT NOT NULL DEFAULT 1,
          wallet_id INT NOT NULL,
          withdrawal_number VARCHAR(50) NOT NULL UNIQUE,
          amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          bank_name VARCHAR(100) NULL,
          account_number VARCHAR(50) NULL,
          ifsc_code VARCHAR(20) NULL,
          account_holder_name VARCHAR(100) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'requested',
          payout_reference VARCHAR(100) NULL,
          admin_notes TEXT NULL,
          requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_seller_withdraw_tenant (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e: any) {
      logger.warn(`Failed to auto-provision wallet tables: ${e?.message}`);
    }
  }

  /**
   * Get or Provision Seller Wallet
   */
  public async getWallet(tenantId: number, storeId = 1): Promise<any> {
    await this.ensureWalletTablesExist();

    let [rows]: any = await sequelize.query(
      `SELECT * FROM seller_wallets WHERE tenant_id = :tenantId LIMIT 1`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    if (!rows) {
      const walletUuid = uuidv4();
      await sequelize.query(
        `INSERT INTO seller_wallets 
          (uuid, tenant_id, store_id, total_balance, pending_balance, available_balance, total_withdrawn, currency, created_at, updated_at)
         VALUES 
          (:uuid, :tenantId, :storeId, 0.00, 0.00, 0.00, 0.00, 'INR', NOW(), NOW())`,
        {
          replacements: { uuid: walletUuid, tenantId, storeId },
          type: QueryTypes.INSERT,
        }
      );

      const [newWallet]: any = await sequelize.query(
        `SELECT * FROM seller_wallets WHERE tenant_id = :tenantId LIMIT 1`,
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      );
      rows = newWallet;
    }

    const [bankAcc]: any = await sequelize.query(
      `SELECT * FROM seller_bank_accounts WHERE tenant_id = :tenantId AND status = 'VERIFIED' ORDER BY id DESC LIMIT 1`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    let bankDetails = null;
    if (bankAcc) {
      bankDetails = {
        bankName: bankAcc.bank_name,
        accountNumber: bankAcc.account_number,
        ifscCode: bankAcc.ifsc_code,
        accountHolderName: bankAcc.account_holder_name,
      };
    } else if (rows.account_number || rows.bank_name) {
      bankDetails = {
        bankName: rows.bank_name || '',
        accountNumber: rows.account_number || '',
        ifscCode: rows.ifsc_code || '',
        accountHolderName: rows.account_holder_name || '',
      };
    }

    // Calculate dynamic real-time balances from orders & withdrawals if wallet balance is 0 or needs sync
    const [orderMetrics]: any = await sequelize.query(
      `SELECT 
        SUM(CASE WHEN LOWER(payment_status) IN ('paid', 'completed') THEN total_amount * 0.95 ELSE 0 END) as net_sales,
        SUM(CASE WHEN LOWER(payment_status) IN ('paid', 'completed') AND LOWER(fulfillment_status) = 'pending' THEN total_amount * 0.95 ELSE 0 END) as pending_escrow,
        SUM(CASE WHEN LOWER(payment_status) IN ('paid', 'completed') AND LOWER(fulfillment_status) = 'delivered' THEN total_amount * 0.95 ELSE 0 END) as delivered_net
       FROM orders 
       WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const [withdrawMetrics]: any = await sequelize.query(
      `SELECT 
        SUM(CASE WHEN LOWER(status) IN ('processed', 'paid', 'approved', 'completed') THEN amount ELSE 0 END) as total_withdrawn
       FROM seller_withdrawals 
       WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const netSales = Number(orderMetrics?.net_sales || 0);
    const totalWithdrawn = Number(withdrawMetrics?.total_withdrawn || 0);
    const calculatedPending = Number(orderMetrics?.pending_escrow || 0);
    const calculatedAvailable = Math.max(0, netSales - totalWithdrawn - calculatedPending);
    const calculatedTotal = Math.max(0, netSales - totalWithdrawn);

    const dbTotal = Number(rows.total_balance || 0);
    const totalBalanceVal = dbTotal > 0 ? dbTotal : Math.max(0, calculatedTotal);
    const pendingBalanceVal = dbTotal > 0 ? Number(rows.pending_balance || 0) : calculatedPending;
    const availableBalanceVal = dbTotal > 0 ? Number(rows.available_balance || 0) : Math.max(0, calculatedAvailable);
    const totalWithdrawnVal = Math.max(Number(rows.total_withdrawn || 0), totalWithdrawn);

    return {
      id: rows.id,
      uuid: rows.uuid,
      tenantId: rows.tenant_id,
      storeId: rows.store_id,
      totalBalance: totalBalanceVal,
      pendingBalance: pendingBalanceVal,
      availableBalance: availableBalanceVal,
      totalWithdrawn: totalWithdrawnVal,
      currency: rows.currency || 'INR',
      bankDetails,
    };
  }

  /**
   * Update Bank Account Details
   */
  public async updateBankDetails(tenantId: number, details: any): Promise<any> {
    await this.getWallet(tenantId);
    await sequelize.query(
      `UPDATE seller_wallets 
       SET bank_name = :bankName, 
           account_number = :accountNumber, 
           ifsc_code = :ifscCode, 
           account_holder_name = :accountHolderName, 
           updated_at = NOW() 
       WHERE tenant_id = :tenantId`,
      {
        replacements: {
          tenantId,
          bankName: details.bankName,
          accountNumber: details.accountNumber,
          ifscCode: details.ifscCode,
          accountHolderName: details.accountHolderName,
        },
        type: QueryTypes.UPDATE,
      }
    );
    return this.getWallet(tenantId);
  }

  /**
   * Customer Order Placed -> Hold Money in Escrow (Pending Balance)
   */
  public async onOrderCreated(
    tenantId: number,
    storeId: number,
    orderId: number,
    amount: number
  ): Promise<void> {
    const wallet = await this.getWallet(tenantId, storeId);
    const newPending = wallet.pendingBalance + amount;
    const newTotal = wallet.totalBalance + amount;

    await sequelize.query(
      `UPDATE seller_wallets 
       SET pending_balance = :newPending, total_balance = :newTotal, updated_at = NOW() 
       WHERE id = :walletId`,
      {
        replacements: { newPending, newTotal, walletId: wallet.id },
        type: QueryTypes.UPDATE,
      }
    );

    const txNum = `TX-ESC-HOLD-${Date.now().toString().slice(-6)}`;
    await sequelize.query(
      `INSERT INTO seller_wallet_transactions 
        (uuid, tenant_id, store_id, wallet_id, order_id, transaction_number, type, amount, balance_after, description, status, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :walletId, :orderId, :txNum, 'escrow_hold', :amount, :balanceAfter, :desc, 'pending', NOW(), NOW())`,
      {
        replacements: {
          uuid: uuidv4(),
          tenantId,
          storeId,
          walletId: wallet.id,
          orderId,
          txNum,
          amount,
          balanceAfter: newTotal,
          desc: `Escrow hold for Order #${orderId}. Money held by Comzilo platform until delivery.`,
        },
        type: QueryTypes.INSERT,
      }
    );
  }

  /**
   * Order Delivered -> Escrow Release: Move funds from Pending to Available (Minus Platform Fee)
   */
  public async onOrderDelivered(
    tenantId: number,
    storeId: number,
    orderId: number,
    orderTotal: number
  ): Promise<void> {
    const wallet = await this.getWallet(tenantId, storeId);
    const platformCommission = Math.round(orderTotal * 0.05 * 100) / 100; // 5% Commission
    const netSellerPayout = orderTotal - platformCommission;

    const newPending = Math.max(0, wallet.pendingBalance - orderTotal);
    const newAvailable = wallet.availableBalance + netSellerPayout;
    const newTotal = wallet.availableBalance + netSellerPayout + newPending;

    await sequelize.query(
      `UPDATE seller_wallets 
       SET pending_balance = :newPending, available_balance = :newAvailable, total_balance = :newTotal, updated_at = NOW() 
       WHERE id = :walletId`,
      {
        replacements: { newPending, newAvailable, newTotal, walletId: wallet.id },
        type: QueryTypes.UPDATE,
      }
    );

    const txNum = `TX-ESC-REL-${Date.now().toString().slice(-6)}`;
    await sequelize.query(
      `INSERT INTO seller_wallet_transactions 
        (uuid, tenant_id, store_id, wallet_id, order_id, transaction_number, type, amount, balance_after, description, status, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :walletId, :orderId, :txNum, 'escrow_release', :netSellerPayout, :newTotal, :desc, 'completed', NOW(), NOW())`,
      {
        replacements: {
          uuid: uuidv4(),
          tenantId,
          storeId,
          walletId: wallet.id,
          orderId,
          txNum,
          amount: netSellerPayout,
          newTotal,
          desc: `Escrow funds released for Order #${orderId} after delivery confirmation. Net payout after 5% platform commission (INR ${platformCommission}).`,
        },
        type: QueryTypes.INSERT,
      }
    );
  }

  /**
   * Seller Requests Withdrawal of Available Funds
   */
  public async requestWithdrawal(
    tenantId: number,
    storeId = 1,
    amount: number,
    bankDetails?: any
  ): Promise<any> {
    const wallet = await this.getWallet(tenantId, storeId);

    if (amount <= 0) {
      throw new ValidationError('Withdrawal amount must be greater than 0.');
    }

    if (amount > wallet.availableBalance) {
      throw new ValidationError(
        `Insufficient available balance for withdrawal. Maximum available: INR ${wallet.availableBalance.toFixed(2)}`
      );
    }

    const bank = bankDetails || wallet.bankDetails;
    const withdrawNum = `WTH-${Date.now().toString().slice(-6)}`;

    // Deduct from Available & Total balance immediately
    const newAvailable = wallet.availableBalance - amount;
    const newTotal = wallet.totalBalance - amount;

    await sequelize.query(
      `UPDATE seller_wallets 
       SET available_balance = :newAvailable, total_balance = :newTotal, updated_at = NOW() 
       WHERE id = :walletId`,
      {
        replacements: { newAvailable, newTotal, walletId: wallet.id },
        type: QueryTypes.UPDATE,
      }
    );

    // Create withdrawal request record
    const withdrawalUuid = uuidv4();
    await sequelize.query(
      `INSERT INTO seller_withdrawals 
        (uuid, tenant_id, store_id, wallet_id, withdrawal_number, amount, bank_name, account_number, ifsc_code, account_holder_name, status, requested_at, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :walletId, :withdrawNum, :amount, :bankName, :accountNumber, :ifscCode, :accountHolderName, 'requested', NOW(), NOW(), NOW())`,
      {
        replacements: {
          uuid: withdrawalUuid,
          tenantId,
          storeId,
          walletId: wallet.id,
          withdrawNum,
          amount,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          ifscCode: bank.ifscCode,
          accountHolderName: bank.accountHolderName,
        },
        type: QueryTypes.INSERT,
      }
    );

    // Log transaction record
    const txNum = `TX-WTH-REQ-${Date.now().toString().slice(-6)}`;
    await sequelize.query(
      `INSERT INTO seller_wallet_transactions 
        (uuid, tenant_id, store_id, wallet_id, transaction_number, type, amount, balance_after, description, status, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :walletId, :txNum, 'withdrawal_payout', :amount, :newTotal, :desc, 'pending', NOW(), NOW())`,
      {
        replacements: {
          uuid: uuidv4(),
          tenantId,
          storeId,
          walletId: wallet.id,
          txNum,
          amount: -amount,
          newTotal,
          desc: `Withdrawal request of INR ${amount.toFixed(2)} to ${bank.bankName} (${bank.accountNumber}).`,
        },
        type: QueryTypes.INSERT,
      }
    );

    return {
      withdrawalNumber: withdrawNum,
      amount,
      status: 'requested',
      bankDetails: bank,
      newAvailableBalance: newAvailable,
    };
  }

  /**
   * Fetch Transaction History for Seller
   */
  public async getTransactions(tenantId: number): Promise<any[]> {
    await this.getWallet(tenantId);
    return await sequelize.query(
      `SELECT id, uuid, transaction_number, type, amount, balance_after, description, status, created_at 
       FROM seller_wallet_transactions 
       WHERE tenant_id = :tenantId 
       ORDER BY id DESC LIMIT 100`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );
  }

  /**
   * Fetch Withdrawals History for Seller
   */
  public async getWithdrawals(tenantId: number): Promise<any[]> {
    await this.getWallet(tenantId);
    const rows: any[] = await sequelize.query(
      `SELECT id, uuid, tenant_id, withdrawal_number, amount, bank_name, account_number, ifsc_code, account_holder_name, status, payout_reference, requested_at, processed_at 
       FROM seller_withdrawals 
       WHERE tenant_id = :tenantId 
       ORDER BY id DESC LIMIT 100`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const commService = new CommissionEngineService();
    return await Promise.all(
      rows.map(async (row) => {
        const grossAmount = Number(row.amount || 0);
        const config = await commService.getCommissionConfig(row.tenant_id || tenantId || 1);
        const platformCommission = Math.round(grossAmount * (config.commissionRate / 100) * 100) / 100;
        const gatewayFee = Math.round((grossAmount * (config.gatewayRate / 100) + config.gatewayFixed) * 100) / 100;
        const netSellerPayout = Math.max(0, Math.round((grossAmount - platformCommission - gatewayFee) * 100) / 100);

        return {
          ...row,
          grossAmount,
          platformCommission,
          gatewayFee,
          netSellerPayout,
          net_amount: netSellerPayout,
        };
      })
    );
  }

  /**
   * Super Admin: Fetch All Seller Withdrawals
   */
  public async getAllWithdrawals(statusFilter?: string): Promise<any[]> {
    await this.ensureWalletTablesExist();

    let query = `
      SELECT w.*, t.name as seller_name 
      FROM seller_withdrawals w
      LEFT JOIN tenants t ON w.tenant_id = t.id
    `;
    const replacements: any = {};

    if (statusFilter && statusFilter !== 'all') {
      query += ` WHERE w.status = :statusFilter`;
      replacements.statusFilter = statusFilter;
    }

    query += ` ORDER BY w.id DESC LIMIT 100`;

    const rows: any[] = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const commService = new CommissionEngineService();

    return await Promise.all(
      rows.map(async (row) => {
        const grossAmount = Number(row.amount || 0);
        const config = await commService.getCommissionConfig(row.tenant_id || 1);
        const platformCommission = Math.round(grossAmount * (config.commissionRate / 100) * 100) / 100;
        const gatewayFee = Math.round((grossAmount * (config.gatewayRate / 100) + config.gatewayFixed) * 100) / 100;
        const shippingFee = Number(config.shippingCharge || 0);
        const processingFee = Number(config.processingFee || 0);
        const totalDeductions = Math.round((platformCommission + gatewayFee + shippingFee + processingFee) * 100) / 100;
        const netSellerPayout = Math.max(0, Math.round((grossAmount - totalDeductions) * 100) / 100);

        return {
          ...row,
          grossAmount,
          platformCommission,
          gatewayFee,
          shippingFee,
          processingFee,
          totalDeductions,
          netSellerPayout,
          net_amount: netSellerPayout,
        };
      })
    );
  }

  /**
   * Super Admin Approves Withdrawal Request (Pending -> Approved)
   */
  public async approveWithdrawal(withdrawalId: number): Promise<any> {
    const [withdrawal]: any = await sequelize.query(
      `SELECT * FROM seller_withdrawals WHERE id = :withdrawalId LIMIT 1`,
      { replacements: { withdrawalId }, type: QueryTypes.SELECT }
    );

    if (!withdrawal) {
      throw new NotFoundError(`Withdrawal request #${withdrawalId} not found.`);
    }

    await sequelize.query(
      `UPDATE seller_withdrawals 
       SET status = 'approved', updated_at = NOW() 
       WHERE id = :withdrawalId`,
      { replacements: { withdrawalId }, type: QueryTypes.UPDATE }
    );

    return { withdrawalId, status: 'approved' };
  }

  /**
   * Super Admin Marks Withdrawal as Paid (Approved/Pending -> Paid)
   */
  public async markWithdrawalPaid(withdrawalId: number, payoutRef = 'SETTLE_PO_123'): Promise<any> {
    const [withdrawal]: any = await sequelize.query(
      `SELECT * FROM seller_withdrawals WHERE id = :withdrawalId LIMIT 1`,
      { replacements: { withdrawalId }, type: QueryTypes.SELECT }
    );

    if (!withdrawal) {
      throw new NotFoundError(`Withdrawal request #${withdrawalId} not found.`);
    }

    if (withdrawal.status === 'paid') {
      throw new ValidationError(
        `Withdrawal request #${withdrawalId} has already been marked as paid.`
      );
    }

    // Update Withdrawal Status
    await sequelize.query(
      `UPDATE seller_withdrawals 
       SET status = 'paid', payout_reference = :payoutRef, processed_at = NOW(), updated_at = NOW() 
       WHERE id = :withdrawalId`,
      { replacements: { withdrawalId, payoutRef }, type: QueryTypes.UPDATE }
    );

    // Update Wallet Total Withdrawn
    await sequelize.query(
      `UPDATE seller_wallets 
       SET total_withdrawn = total_withdrawn + :amount, updated_at = NOW() 
       WHERE id = :walletId`,
      {
        replacements: { amount: withdrawal.amount, walletId: withdrawal.wallet_id },
        type: QueryTypes.UPDATE,
      }
    );

    // Record Settlement Transaction in seller_wallet_transactions
    const txNum = `TX-SETTLE-${Date.now().toString().slice(-6)}`;
    await sequelize.query(
      `INSERT INTO seller_wallet_transactions 
        (uuid, tenant_id, store_id, wallet_id, withdrawal_id, transaction_number, type, amount, balance_after, description, status, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :walletId, :withdrawalId, :txNum, 'settlement', :amount, 0.00, :desc, 'completed', NOW(), NOW())`,
      {
        replacements: {
          uuid: uuidv4(),
          tenantId: withdrawal.tenant_id,
          storeId: withdrawal.store_id || 1,
          walletId: withdrawal.wallet_id,
          withdrawalId,
          txNum,
          amount: Number(withdrawal.amount),
          desc: `Bank Settlement Payout of INR ${Number(withdrawal.amount).toFixed(2)} processed to ${withdrawal.bank_name || 'Bank Account'}. Bank UTR Ref: ${payoutRef}`,
        },
        type: QueryTypes.INSERT,
      }
    );

    return {
      withdrawalId,
      status: 'paid',
      payoutReference: payoutRef,
      paidAt: new Date(),
    };
  }

  /**
   * Super Admin Rejects Withdrawal Request (Pending/Approved -> Rejected + Refund to Seller Available Balance)
   */
  public async rejectWithdrawal(
    withdrawalId: number,
    reason = 'Request rejected by admin'
  ): Promise<any> {
    const [withdrawal]: any = await sequelize.query(
      `SELECT * FROM seller_withdrawals WHERE id = :withdrawalId LIMIT 1`,
      { replacements: { withdrawalId }, type: QueryTypes.SELECT }
    );

    if (!withdrawal) {
      throw new NotFoundError(`Withdrawal request #${withdrawalId} not found.`);
    }

    if (withdrawal.status === 'rejected') {
      throw new ValidationError(`Withdrawal request #${withdrawalId} is already rejected.`);
    }

    if (withdrawal.status === 'paid') {
      throw new ValidationError(`Cannot reject a withdrawal that has already been marked paid.`);
    }

    // Update Withdrawal status to rejected
    await sequelize.query(
      `UPDATE seller_withdrawals 
       SET status = 'rejected', admin_notes = :reason, updated_at = NOW() 
       WHERE id = :withdrawalId`,
      { replacements: { withdrawalId, reason }, type: QueryTypes.UPDATE }
    );

    // Refund reserved amount back to seller wallet's Available Balance
    await sequelize.query(
      `UPDATE seller_wallets 
       SET available_balance = available_balance + :amount, total_balance = total_balance + :amount, updated_at = NOW() 
       WHERE id = :walletId`,
      {
        replacements: { amount: withdrawal.amount, walletId: withdrawal.wallet_id },
        type: QueryTypes.UPDATE,
      }
    );

    // Log transaction refund
    const txNum = `TX-WTH-RFD-${Date.now().toString().slice(-6)}`;
    await sequelize.query(
      `INSERT INTO seller_wallet_transactions 
        (uuid, tenant_id, store_id, wallet_id, withdrawal_id, transaction_number, type, amount, balance_after, description, status, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :walletId, :withdrawalId, :txNum, 'credit', :amount, 0.00, :desc, 'completed', NOW(), NOW())`,
      {
        replacements: {
          uuid: uuidv4(),
          tenantId: withdrawal.tenant_id,
          storeId: withdrawal.store_id,
          walletId: withdrawal.wallet_id,
          withdrawalId,
          txNum,
          amount: withdrawal.amount,
          desc: `Refund for rejected withdrawal #${withdrawal.withdrawal_number}. Reason: ${reason}`,
        },
        type: QueryTypes.INSERT,
      }
    );

    return { withdrawalId, status: 'rejected', reason };
  }

  /**
   * Withdrawal Financial Reports for Admin
   */
  public async getWithdrawalReports(): Promise<any> {
    await this.ensureWalletTablesExist();

    const [totals]: any = await sequelize.query(
      `SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN LOWER(status) IN ('pending', 'requested') THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN LOWER(status) IN ('approved', 'processing') THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN LOWER(status) IN ('paid', 'completed', 'settled', 'processed') THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN LOWER(status) IN ('rejected', 'failed', 'refunded') THEN amount ELSE 0 END) as rejected_amount,
        SUM(CASE WHEN LOWER(status) IN ('pending', 'requested') THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN LOWER(status) IN ('approved', 'processing') THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN LOWER(status) IN ('paid', 'completed', 'settled', 'processed') THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN LOWER(status) IN ('rejected', 'failed', 'refunded') THEN 1 ELSE 0 END) as rejected_count
       FROM seller_withdrawals`,
      { type: QueryTypes.SELECT }
    );

    return {
      totalRequests: Number(totals?.total_requests || 0),
      pendingAmount: Number(totals?.pending_amount || 0),
      approvedAmount: Number(totals?.approved_amount || 0),
      paidAmount: Number(totals?.paid_amount || 0),
      rejectedAmount: Number(totals?.rejected_amount || 0),
      pendingCount: Number(totals?.pending_count || 0),
      approvedCount: Number(totals?.approved_count || 0),
      paidCount: Number(totals?.paid_count || 0),
      rejectedCount: Number(totals?.rejected_count || 0),
    };
  }

  /**
   * Get Tenant-Scoped Seller Financial Intelligence Dashboard Data
   */
  public async getSellerFinancialDashboard(tenantId: number): Promise<any> {
    await this.ensureWalletTablesExist();
    const wallet = await this.getWallet(tenantId);

    // 1. Today's Revenue
    const [todayRes]: any = await sequelize.query(
      `SELECT SUM(COALESCE(net_seller_payout, order_total * 0.95, 0)) as today_revenue
       FROM order_commissions 
       WHERE tenant_id = :tenantId AND DATE(created_at) = CURDATE()`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const [todayOrderRes]: any = await sequelize.query(
      `SELECT SUM(total_amount * 0.95) as today_revenue
       FROM orders 
       WHERE tenant_id = :tenantId AND LOWER(payment_status) IN ('paid', 'completed') AND DATE(created_at) = CURDATE()`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const todayRevenueVal = Number(todayRes?.today_revenue || todayOrderRes?.today_revenue || 0);

    // 2. Monthly Revenue
    const [monthRes]: any = await sequelize.query(
      `SELECT SUM(COALESCE(net_seller_payout, order_total * 0.95, 0)) as monthly_revenue
       FROM order_commissions 
       WHERE tenant_id = :tenantId AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const [monthOrderRes]: any = await sequelize.query(
      `SELECT SUM(total_amount * 0.95) as monthly_revenue
       FROM orders 
       WHERE tenant_id = :tenantId AND LOWER(payment_status) IN ('paid', 'completed')`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const monthlyRevenueVal = Number(monthRes?.monthly_revenue || monthOrderRes?.monthly_revenue || 0);

    // 3. Settlements History
    let settlements: any = await sequelize.query(
      `SELECT * FROM seller_wallet_transactions 
       WHERE tenant_id = :tenantId
       ORDER BY id DESC LIMIT 20`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    if (!settlements || settlements.length === 0) {
      settlements = await sequelize.query(
        `SELECT id, uuid, order_number as transaction_number, 'Order Escrow Settlement' as description, total_amount * 0.95 as amount, 'completed' as status, created_at
         FROM orders 
         WHERE tenant_id = :tenantId AND LOWER(payment_status) IN ('paid', 'completed')
         ORDER BY id DESC LIMIT 20`,
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      );
    }

    // 4. Withdrawal History
    const withdrawals: any = await sequelize.query(
      `SELECT * FROM seller_withdrawals 
       WHERE tenant_id = :tenantId ORDER BY id DESC LIMIT 20`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    // 5. Invoices
    let invoices: any = await sequelize.query(
      `SELECT id, 'INV-' as prefix, amount, currency, status, created_at 
       FROM subscriptions WHERE tenant_id = :tenantId 
       ORDER BY id DESC LIMIT 20`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    if (!invoices || invoices.length === 0) {
      invoices = await sequelize.query(
        `SELECT id, 'INV-' as prefix, total_amount as amount, 'INR' as currency, 'PAID' as status, created_at
         FROM orders WHERE tenant_id = :tenantId AND LOWER(payment_status) IN ('paid', 'completed')
         ORDER BY id DESC LIMIT 20`,
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      );
    }

    // 6. Commission Reports
    const commissions: any = await sequelize.query(
      `SELECT * FROM order_commissions 
       WHERE tenant_id = :tenantId ORDER BY id DESC LIMIT 20`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    // 7. Revenue Chart (Daily Last 14 Days)
    let revenueChart: any = await sequelize.query(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') as date,
        SUM(COALESCE(net_seller_payout, order_total * 0.95, 0)) as amount
       FROM order_commissions 
       WHERE tenant_id = :tenantId 
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY date ASC LIMIT 14`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    if (!revenueChart || revenueChart.length === 0) {
      revenueChart = await sequelize.query(
        `SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d') as date,
          SUM(total_amount * 0.95) as amount
         FROM orders 
         WHERE tenant_id = :tenantId AND LOWER(payment_status) IN ('paid', 'completed')
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
         ORDER BY date ASC LIMIT 14`,
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      );
    }

    return {
      todayRevenue: todayRevenueVal,
      monthlyRevenue: monthlyRevenueVal,
      totalBalance: Number(wallet.totalBalance || 0),
      pendingBalance: Number(wallet.pendingBalance || 0),
      availableBalance: Number(wallet.availableBalance || 0),
      settlementHistory: settlements || [],
      withdrawalHistory: withdrawals || [],
      invoices: invoices || [],
      commissionReports: commissions || [],
      revenueChart: revenueChart || [],
    };
  }
}
