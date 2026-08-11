import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError } from '../shared/errors/AppError';
import { logger } from '../shared/logging/logger';

export interface CommissionConfig {
  tenantId: number;
  commissionRate: number; // e.g., 10.0 for 10%
  gatewayRate: number; // e.g., 2.0 for 2%
  gatewayFixed: number; // e.g., 3.0 for $3
  shippingCharge: number; // e.g., 5.0 for $5
  processingFee: number; // e.g., 1.0 for $1
  taxRate: number; // e.g., 0.0 or 18.0 for GST/Tax
}

export interface PayoutBreakdown {
  orderId: number;
  orderTotal: number;
  subtotal: number;
  platformCommission: number;
  gatewayFee: number;
  shippingFee: number;
  processingFee: number;
  taxAmount: number;
  totalDeductions: number;
  netSellerPayout: number;
}

export class CommissionEngineService {
  /**
   * Ensure Commission Tables Exist
   */
  public async ensureTablesExist(): Promise<void> {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS commission_configs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL UNIQUE,
          commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
          gateway_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
          gateway_fixed DECIMAL(8,2) NOT NULL DEFAULT 3.00,
          shipping_charge DECIMAL(8,2) NOT NULL DEFAULT 5.00,
          processing_fee DECIMAL(8,2) NOT NULL DEFAULT 0.00,
          tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_comm_config_tenant (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS order_commissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uuid VARCHAR(36) NOT NULL UNIQUE,
          tenant_id INT NOT NULL,
          store_id INT NOT NULL DEFAULT 1,
          order_id INT NOT NULL UNIQUE,
          order_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          platform_commission DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          gateway_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          processing_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          net_seller_payout DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_order_comm_tenant (tenant_id),
          INDEX idx_order_comm_order (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e: any) {
      logger.warn(`Commission tables auto-provision warning: ${e?.message}`);
    }
  }

  /**
   * Get Commission Config for Tenant (Or default)
   */
  public async getCommissionConfig(tenantId = 1): Promise<CommissionConfig> {
    await this.ensureTablesExist();

    const [row]: any = await sequelize.query(
      `SELECT * FROM commission_configs WHERE tenant_id = :tenantId LIMIT 1`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    if (!row) {
      return {
        tenantId,
        commissionRate: 10.0, // 10% Platform Commission
        gatewayRate: 0.0,
        gatewayFixed: 3.0, // $3 Gateway Fee
        shippingCharge: 5.0, // $5 Shipping Fee
        processingFee: 0.0, // $0 Processing Fee
        taxRate: 0.0, // 0% Tax
      };
    }

    return {
      tenantId,
      commissionRate: Number(row.commission_rate || 10.0),
      gatewayRate: Number(row.gateway_rate || 0.0),
      gatewayFixed: Number(row.gateway_fixed || 3.0),
      shippingCharge: Number(row.shipping_charge || 5.0),
      processingFee: Number(row.processing_fee || 0.0),
      taxRate: Number(row.tax_rate || 0.0),
    };
  }

  /**
   * Update Commission Config (Admin Settings)
   */
  public async updateCommissionConfig(
    tenantId: number,
    config: Partial<CommissionConfig>
  ): Promise<CommissionConfig> {
    await this.ensureTablesExist();

    const current = await this.getCommissionConfig(tenantId);
    const updated = { ...current, ...config };

    await sequelize.query(
      `INSERT INTO commission_configs 
        (tenant_id, commission_rate, gateway_rate, gateway_fixed, shipping_charge, processing_fee, tax_rate, created_at, updated_at)
       VALUES 
        (:tenantId, :commRate, :gwRate, :gwFixed, :shipCharge, :procFee, :taxRate, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
        commission_rate = VALUES(commission_rate),
        gateway_rate = VALUES(gateway_rate),
        gateway_fixed = VALUES(gateway_fixed),
        shipping_charge = VALUES(shipping_charge),
        processing_fee = VALUES(processing_fee),
        tax_rate = VALUES(tax_rate),
        updated_at = NOW()`,
      {
        replacements: {
          tenantId,
          commRate: updated.commissionRate,
          gwRate: updated.gatewayRate,
          gwFixed: updated.gatewayFixed,
          shipCharge: updated.shippingCharge,
          procFee: updated.processingFee,
          taxRate: updated.taxRate,
        },
        type: QueryTypes.INSERT,
      }
    );

    return this.getCommissionConfig(tenantId);
  }

  /**
   * Calculate Itemized Breakdown for Order
   * Formula:
   *  Order Total = $100
   *  Commission (10%) = $10
   *  Gateway Fee = $3
   *  Shipping = $5
   *  Seller Receives = $82
   */
  public async calculateOrderPayout(
    tenantId: number,
    orderId: number,
    orderTotal: number,
    subtotal?: number
  ): Promise<PayoutBreakdown> {
    const config = await this.getCommissionConfig(tenantId);

    const baseSubtotal = subtotal || orderTotal;
    const platformCommission = Math.round(baseSubtotal * (config.commissionRate / 100) * 100) / 100;
    const gatewayFee =
      Math.round((orderTotal * (config.gatewayRate / 100) + config.gatewayFixed) * 100) / 100;
    const shippingFee = Number(config.shippingCharge || 0);
    const processingFee = Number(config.processingFee || 0);

    const taxableFees = platformCommission + gatewayFee + processingFee;
    const taxAmount = Math.round(taxableFees * (config.taxRate / 100) * 100) / 100;

    const totalDeductions =
      Math.round(
        (platformCommission + gatewayFee + shippingFee + processingFee + taxAmount) * 100
      ) / 100;
    const netSellerPayout = Math.max(0, Math.round((orderTotal - totalDeductions) * 100) / 100);

    return {
      orderId,
      orderTotal,
      subtotal: baseSubtotal,
      platformCommission,
      gatewayFee,
      shippingFee,
      processingFee,
      taxAmount,
      totalDeductions,
      netSellerPayout,
    };
  }

  /**
   * Calculate and Save Breakdown Record for Order
   */
  public async processAndSaveOrderCommission(
    tenantId: number,
    storeId: number,
    orderId: number,
    orderTotal: number,
    subtotal?: number,
    options?: { transaction?: any }
  ): Promise<PayoutBreakdown> {
    await this.ensureTablesExist();

    const breakdown = await this.calculateOrderPayout(tenantId, orderId, orderTotal, subtotal);
    const t = options?.transaction;

    await sequelize.query(
      `INSERT INTO order_commissions 
        (uuid, tenant_id, store_id, order_id, order_total, subtotal, platform_commission, gateway_fee, shipping_fee, processing_fee, tax_amount, total_deductions, net_seller_payout, created_at, updated_at)
       VALUES 
        (:uuid, :tenantId, :storeId, :orderId, :total, :sub, :comm, :gw, :ship, :proc, :tax, :deduct, :payout, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
        order_total = VALUES(order_total),
        subtotal = VALUES(subtotal),
        platform_commission = VALUES(platform_commission),
        gateway_fee = VALUES(gateway_fee),
        shipping_fee = VALUES(shipping_fee),
        processing_fee = VALUES(processing_fee),
        tax_amount = VALUES(tax_amount),
        total_deductions = VALUES(total_deductions),
        net_seller_payout = VALUES(net_seller_payout),
        updated_at = NOW()`,
      {
        replacements: {
          uuid: uuidv4(),
          tenantId,
          storeId,
          orderId,
          total: breakdown.orderTotal,
          sub: breakdown.subtotal,
          comm: breakdown.platformCommission,
          gw: breakdown.gatewayFee,
          ship: breakdown.shippingFee,
          proc: breakdown.processingFee,
          tax: breakdown.taxAmount,
          deduct: breakdown.totalDeductions,
          payout: breakdown.netSellerPayout,
        },
        type: QueryTypes.INSERT,
        ...(t ? { transaction: t } : {}),
      }
    );

    return breakdown;
  }

  /**
   * Get Breakdown by Order ID
   */
  public async getOrderCommission(tenantId: number, orderId: number): Promise<any> {
    await this.ensureTablesExist();

    const [row]: any = await sequelize.query(
      `SELECT * FROM order_commissions WHERE order_id = :orderId LIMIT 1`,
      { replacements: { orderId }, type: QueryTypes.SELECT }
    );

    if (!row) {
      // Calculate mock dynamically if not found
      return await this.calculateOrderPayout(tenantId, orderId, 100.0, 100.0);
    }

    return {
      orderId: row.order_id,
      orderTotal: Number(row.order_total),
      subtotal: Number(row.subtotal),
      platformCommission: Number(row.platform_commission),
      gatewayFee: Number(row.gateway_fee),
      shippingFee: Number(row.shipping_fee),
      processingFee: Number(row.processing_fee),
      taxAmount: Number(row.tax_amount),
      totalDeductions: Number(row.total_deductions),
      netSellerPayout: Number(row.net_seller_payout),
      createdAt: row.created_at,
    };
  }

  /**
   * Generate Financial Commission Reports for Admin
   */
  public async getCommissionReport(tenantId?: number): Promise<any> {
    await this.ensureTablesExist();

    const [totals]: any = await sequelize.query(
      `SELECT 
        COUNT(*) as total_orders_processed,
        SUM(order_total) as gross_gmv,
        SUM(platform_commission) as total_platform_commission,
        SUM(gateway_fee) as total_gateway_fees,
        SUM(shipping_fee) as total_shipping_fees,
        SUM(processing_fee) as total_processing_fees,
        SUM(tax_amount) as total_taxes,
        SUM(total_deductions) as total_platform_revenue,
        SUM(net_seller_payout) as total_seller_payouts
       FROM order_commissions`,
      { type: QueryTypes.SELECT }
    );

    const [recent]: any = await sequelize.query(
      `SELECT oc.*, o.order_number 
       FROM order_commissions oc 
       LEFT JOIN orders o ON oc.order_id = o.id 
       ORDER BY oc.id DESC LIMIT 50`,
      { type: QueryTypes.SELECT }
    );

    return {
      summary: {
        totalOrdersProcessed: Number(totals?.total_orders_processed || 0),
        grossGmv: Number(totals?.gross_gmv || 0),
        totalPlatformCommission: Number(totals?.total_platform_commission || 0),
        totalGatewayFees: Number(totals?.total_gateway_fees || 0),
        totalShippingFees: Number(totals?.total_shipping_fees || 0),
        totalProcessingFees: Number(totals?.total_processing_fees || 0),
        totalTaxes: Number(totals?.total_taxes || 0),
        totalPlatformRevenue: Number(totals?.total_platform_revenue || 0),
        totalSellerPayouts: Number(totals?.total_seller_payouts || 0),
      },
      recentBreakdowns: recent || [],
    };
  }
}
