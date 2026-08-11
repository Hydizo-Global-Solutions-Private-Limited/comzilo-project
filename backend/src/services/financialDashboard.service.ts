/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export class FinancialDashboardService {
  /**
   * Get Financial Overview Metrics & Analytics
   */
  public async getFinancialOverview(startDate?: string, endDate?: string): Promise<any> {
    let dateFilter = '';
    const replacements: any = {};

    if (startDate && endDate) {
      dateFilter = ` WHERE created_at BETWEEN :startDate AND :endDate `;
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    // 1. Marketplace GMV & Total Orders
    const [gmvResult]: any = await sequelize.query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(COALESCE(total_amount, 0)) as gmv,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_volume,
        SUM(CASE WHEN status IN ('cancelled', 'refunded') THEN total_amount ELSE 0 END) as refund_volume,
        SUM(CASE WHEN status IN ('cancelled', 'refunded') THEN 1 ELSE 0 END) as refund_count
       FROM orders ${dateFilter}`,
      { replacements, type: QueryTypes.SELECT }
    );

    // 2. Subscription Revenue
    const [subResult]: any = await sequelize.query(
      `SELECT 
        COUNT(*) as total_subscriptions,
        SUM(COALESCE(amount, 0)) as subscription_revenue
       FROM subscriptions ${dateFilter}`,
      { replacements, type: QueryTypes.SELECT }
    );

    // 3. Commissions & Platform Earnings
    const [commResult]: any = await sequelize.query(
      `SELECT 
        SUM(COALESCE(platform_commission, 0)) as total_commission,
        SUM(COALESCE(gateway_fee, 0)) as total_gateway_fee,
        SUM(COALESCE(shipping_fee, 0)) as total_shipping_fee,
        SUM(COALESCE(net_seller_payout, 0)) as net_seller_payout
       FROM order_commissions ${dateFilter}`,
      { replacements, type: QueryTypes.SELECT }
    );

    // 4. Wallet & Settlement Balances
    const [payoutResult]: any = await sequelize.query(
      `SELECT SUM(COALESCE(amount, 0)) as completed_settlements FROM payout_history WHERE status = 'processed'`,
      { type: QueryTypes.SELECT }
    );

    const [walletResult]: any = await sequelize.query(
      `SELECT 
        SUM(COALESCE(total_balance, 0)) as total_wallet_balance,
        SUM(COALESCE(pending_balance, 0)) as pending_settlements,
        SUM(COALESCE(available_balance, 0)) as available_settlements
       FROM seller_wallets`,
      { type: QueryTypes.SELECT }
    );

    // 5. Chargebacks & Disputes
    const [disputeResult]: any = await sequelize.query(
      `SELECT 
        COUNT(*) as chargeback_count,
        SUM(COALESCE(amount, 0)) as chargeback_volume
       FROM seller_wallet_transactions WHERE type = 'chargeback' OR description LIKE '%dispute%'`,
      { type: QueryTypes.SELECT }
    );

    // 6. Payment Method Breakdown
    const paymentBreakdown: any = await sequelize.query(
      `SELECT 
        'RAZORPAY' as method,
        COUNT(*) as count,
        SUM(COALESCE(total_amount, 0)) as amount
       FROM orders ${dateFilter.includes('WHERE') ? dateFilter + ' AND deleted_at IS NULL AND order_number NOT LIKE \'ORD-17%\'' : 'WHERE deleted_at IS NULL AND order_number NOT LIKE \'ORD-17%\''}`,
      { replacements, type: QueryTypes.SELECT }
    );

    // 7. Monthly Revenue Trend (Last 6 Months)
    const monthlyTrend: any = await sequelize.query(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        SUM(COALESCE(total_amount, 0)) as gmv,
        SUM(COALESCE(total_amount * 0.10, 0)) as estimated_revenue
       FROM orders 
       WHERE deleted_at IS NULL AND order_number NOT LIKE 'ORD-17%'
       GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
       ORDER BY month ASC LIMIT 6`,
      { type: QueryTypes.SELECT }
    );

    const subscriptionRev = Number(subResult?.subscription_revenue || 0);
    const commissionRev = Number(commResult?.total_commission || 0);
    const gatewayRev = Number(commResult?.total_gateway_fee || 0);
    const platformRevenue = commissionRev + gatewayRev + subscriptionRev;

    return {
      platformRevenue: Number(platformRevenue.toFixed(2)),
      subscriptionRevenue: Number(subscriptionRev.toFixed(2)),
      marketplaceRevenue: Number(Number(gmvResult?.gmv || 0).toFixed(2)),
      pendingSettlements: Number(Number(walletResult?.pending_settlements || 0).toFixed(2)),
      completedSettlements: Number(Number(payoutResult?.completed_settlements || 0).toFixed(2)),
      refunds: {
        count: Number(gmvResult?.refund_count || 0),
        amount: Number(Number(gmvResult?.refund_volume || 0).toFixed(2)),
      },
      chargebacks: {
        count: Number(disputeResult?.chargeback_count || 0),
        amount: Number(Number(disputeResult?.chargeback_volume || 0).toFixed(2)),
      },
      paymentMethodBreakdown: paymentBreakdown || [],
      monthlyRevenueTrend: monthlyTrend || [],
    };
  }

  /**
   * Gateway Audit Logs
   */
  public async getGatewayLogs(): Promise<any[]> {
    return await sequelize.query(
      `SELECT 
        id, order_number, payment_status, 'RAZORPAY' as payment_method, total_amount as amount, uuid as transaction_id, created_at
       FROM orders 
       ORDER BY id DESC LIMIT 50`,
      { type: QueryTypes.SELECT }
    );
  }

  /**
   * Webhook Logs
   */
  public async getWebhookLogs(): Promise<any[]> {
    try {
      return await sequelize.query(
        `SELECT id, action as event, provider, status_code, request_payload, response_payload, created_at 
         FROM payout_logs WHERE action LIKE '%WEBHOOK%' OR action LIKE '%HOOK%'
         ORDER BY id DESC LIMIT 50`,
        { type: QueryTypes.SELECT }
      );
    } catch {
      return [];
    }
  }

  /**
   * Payout Logs
   */
  public async getPayoutLogs(): Promise<any[]> {
    try {
      return await sequelize.query(
        `SELECT id, withdrawal_id, action, provider, status_code, execution_time_ms, created_at 
         FROM payout_logs ORDER BY id DESC LIMIT 50`,
        { type: QueryTypes.SELECT }
      );
    } catch {
      return [];
    }
  }
}
