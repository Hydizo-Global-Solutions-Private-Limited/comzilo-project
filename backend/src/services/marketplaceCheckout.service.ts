/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryTypes, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/database';
import {
  Customer,
  Order,
  OrderItem,
  Invoice,
  Product,
  WalletTransaction,
  PaymentSettlement,
  Notification,
} from '../database/models';
import { logger } from '../shared/logging/logger';

export interface MarketplaceCheckoutSyncOptions {
  mainOrder: any;
  items: Array<{
    productId: number;
    variantId?: number | null;
    productVariantId?: number | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    total: number;
    sku?: string;
    variantSku?: string;
    productName?: string;
    variantAttributes?: any;
  }>;
  customer: any;
  paymentDetails: {
    paymentMethod: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    notes?: string;
  };
  transaction?: Transaction;
}

export class MarketplaceCheckoutService {
  /**
   * Synchronizes marketplace checkout order with all seller tenants in a single DB transaction.
   */
  public static async syncSellerOrdersAndFinancials(
    options: MarketplaceCheckoutSyncOptions
  ): Promise<void> {
    const { mainOrder, items, customer, paymentDetails, transaction: t } = options;

    if (!items || items.length === 0) return;

    // 1. Fetch products to resolve seller tenant IDs
    const productIds = items.map((it) => it.productId);
    const products = await Product.findAll({
      where: { id: productIds },
      ...(t ? { transaction: t } : {}),
    });

    const productTenantMap = new Map<number, number>();
    products.forEach((p: any) => {
      productTenantMap.set(p.id, Number(p.tenantId || 1));
    });

    // 2. Group items by Seller Tenant ID
    const sellerItemsMap = new Map<number, typeof items>();
    for (const item of items) {
      const sellerTenantId =
        productTenantMap.get(item.productId) || Number(mainOrder.tenantId || 1);
      if (!sellerItemsMap.has(sellerTenantId)) {
        sellerItemsMap.set(sellerTenantId, []);
      }
      sellerItemsMap.get(sellerTenantId)!.push(item);
    }

    // 3. Ensure general ledger table exists
    await sequelize
      .query(
        `
        CREATE TABLE IF NOT EXISTS finance_general_ledger (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          reference VARCHAR(100),
          description TEXT,
          debit DECIMAL(12,2) DEFAULT 0,
          credit DECIMAL(12,2) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `
      )
      .catch(() => {});

    // 4. Process each Seller Tenant
    for (const [sellerTenantId, sellerItems] of sellerItemsMap.entries()) {
      // Resolve active store ID for seller tenant
      let sellerStoreId = 1;
      const [sellerStoreRow]: any = await sequelize.query(
        'SELECT id FROM stores WHERE tenant_id = :sellerTenantId AND status = "active" ORDER BY id ASC LIMIT 1',
        { replacements: { sellerTenantId }, type: QueryTypes.SELECT, transaction: t }
      );
      if (sellerStoreRow && sellerStoreRow.id) {
        sellerStoreId = Number(sellerStoreRow.id);
      }

      // Calculate totals for seller items
      let sellerSubtotal = 0;
      for (const sItem of sellerItems) {
        sellerSubtotal += Number(sItem.subtotal || sItem.unitPrice * sItem.quantity);
      }

      // Proportional discount/tax/shipping or clean totals
      const sellerDiscount = 0;
      const sellerTax = Math.round(sellerSubtotal * 0.08 * 100) / 100;
      const sellerShipping = 0;
      const sellerTotal = sellerSubtotal + sellerTax;

      // a. Sync / Create Seller Customer
      let sellerCustomer = await Customer.findOne({
        where: { tenantId: sellerTenantId, email: customer.email },
        transaction: t,
      });

      if (!sellerCustomer) {
        sellerCustomer = await Customer.create(
          {
            tenantId: sellerTenantId,
            storeId: sellerStoreId,
            uuid: uuidv4(),
            customerCode: `CUST-SLR-${Date.now().toString().slice(-6)}`,
            userId: customer.userId || null,
            email: customer.email,
            firstName: customer.firstName || 'Valued',
            lastName: customer.lastName || 'Customer',
            fullName:
              customer.fullName ||
              `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
              customer.email,
            phone: customer.phone || '+915221187774',
            status: 'active',
          } as any,
          { transaction: t }
        );
      }

      // b. Create Seller Sales Order
      const sellerOrderNumber = `SLR-${sellerTenantId}-ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
      const sellerOrder: any = await Order.create(
        {
          tenantId: sellerTenantId,
          storeId: sellerStoreId,
          orderNumber: sellerOrderNumber,
          customerId: sellerCustomer.id,
          customerEmail: customer.email,
          status: 'pending',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
          currency: 'INR',
          subtotal: sellerSubtotal,
          discountAmount: sellerDiscount,
          taxAmount: sellerTax,
          shippingAmount: sellerShipping,
          totalAmount: sellerTotal,
          paymentMethod: paymentDetails.paymentMethod || 'razorpay',
          notes:
            paymentDetails.notes || `Marketplace Checkout Order (Parent #${mainOrder.orderNumber})`,
        } as any,
        { transaction: t }
      );

      // c. Create Seller Order Items
      for (const sItem of sellerItems) {
        await OrderItem.create(
          {
            tenantId: sellerTenantId,
            storeId: sellerStoreId,
            orderId: sellerOrder.id,
            productId: sItem.productId,
            variantId: sItem.variantId || (sItem as any).productVariantId || null,
            productVariantId: sItem.variantId || (sItem as any).productVariantId || null,
            sku: sItem.sku || `SKU-${sItem.productId}`,
            variantSku: (sItem as any).variantSku || sItem.sku || null,
            productName: sItem.productName || 'Catalog Item',
            variantAttributes: (sItem as any).variantAttributes || null,
            unitPrice: sItem.unitPrice,
            quantity: sItem.quantity,
            subtotal: sItem.subtotal,
            total: sItem.total || sItem.subtotal,
          } as any,
          { transaction: t }
        );
      }

      // d. Create Seller Invoice
      const invNum = `INV-SLR-${sellerTenantId}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      await Invoice.create(
        {
          tenantId: sellerTenantId,
          storeId: sellerStoreId,
          orderId: sellerOrder.id,
          invoiceNumber: invNum,
          invoiceStatus: 'issued',
          subtotal: Number(sellerSubtotal || 0),
          tax: Number(sellerTax || 0),
          discount: Number(sellerDiscount || 0),
          total: Number(sellerTotal || 0),
          subtotalAmount: Number(sellerSubtotal || 0),
          taxAmount: Number(sellerTax || 0),
          discountAmount: Number(sellerDiscount || 0),
          totalAmount: Number(sellerTotal || 0),
          issuedAt: new Date(),
          dueDate: new Date(),
        } as any,
        { transaction: t }
      );

      // e. Create Seller Payment Record
      const sellerPayNum = `PAY-SLR-${sellerTenantId}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      await sequelize.query(
        `INSERT INTO payments 
          (uuid, tenant_id, store_id, order_id, payment_number, payment_method, payment_status, gateway, gateway_reference, transaction_reference, amount, currency, paid_at, notes, metadata, created_at, updated_at)
         VALUES 
          (:uuid, :tenantId, :storeId, :orderId, :payNum, :method, 'paid', 'razorpay', :gwRef, :txRef, :amount, 'INR', NOW(), :notes, :metadata, NOW(), NOW())`,
        {
          replacements: {
            uuid: uuidv4(),
            tenantId: sellerTenantId,
            storeId: sellerStoreId,
            orderId: sellerOrder.id,
            payNum: sellerPayNum,
            method: paymentDetails.paymentMethod || 'razorpay',
            gwRef: paymentDetails.razorpayOrderId || `rzp_ord_${Date.now()}`,
            txRef: paymentDetails.razorpayPaymentId || `rzp_pay_${Date.now()}`,
            amount: sellerTotal,
            notes: `Payment for Seller Sales Order #${sellerOrder.orderNumber}`,
            metadata: JSON.stringify({
              sellerTenantId,
              mainOrderId: mainOrder.id,
              mainOrderNumber: mainOrder.orderNumber,
            }),
          },
          type: QueryTypes.INSERT,
          transaction: t,
        }
      );

      // f. Commission Calculation & Seller Wallet Entry
      const platformCommissionRate = 0.1; // 10% Platform Commission
      const platformCommission = Math.round(sellerTotal * platformCommissionRate * 100) / 100;
      const netSellerPayout = Math.max(
        0,
        Math.round((sellerTotal - platformCommission) * 100) / 100
      );

      const lastWalletTx: any = await WalletTransaction.findOne({
        where: { tenantId: sellerTenantId },
        order: [['id', 'DESC']],
        transaction: t,
      });

      const previousBalance = Number(lastWalletTx?.balanceAfter || 0);
      const newBalance = Math.round((previousBalance + netSellerPayout) * 100) / 100;

      await WalletTransaction.create(
        {
          tenantId: sellerTenantId,
          storeId: sellerStoreId,
          customerId: sellerCustomer.id,
          transactionType: 'credit',
          amount: netSellerPayout,
          balanceAfter: newBalance,
          reference: `Net Earnings for Order #${sellerOrder.orderNumber} (Gross: INR ${sellerTotal.toFixed(
            2
          )}, Commission: INR ${platformCommission.toFixed(2)})`,
        } as any,
        { transaction: t }
      );

      // g. Create Settlement Record (Pending)
      const stlNumber = `STL-SLR-${sellerTenantId}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      await PaymentSettlement.create(
        {
          tenantId: sellerTenantId,
          storeId: sellerStoreId,
          gatewayCode: 'razorpay',
          settlementNumber: stlNumber,
          settlementDate: new Date().toISOString().split('T')[0],
          grossAmount: sellerTotal,
          gatewayFees: 0,
          taxAmount: sellerTax,
          netAmount: netSellerPayout,
          status: 'pending',
        } as any,
        { transaction: t }
      );

      // h. Create General Ledger Entry for Admin & Seller Financial Visibility
      await sequelize
        .query(
          `INSERT INTO finance_general_ledger (tenant_id, reference, description, debit, credit, created_at)
           VALUES (:tenantId, :ref, :desc, :debit, :credit, NOW())`,
          {
            replacements: {
              tenantId: sellerTenantId,
              ref: sellerOrder.orderNumber,
              desc: `Marketplace Order Credit (Seller Gross: INR ${sellerTotal.toFixed(
                2
              )}, Net Payout: INR ${netSellerPayout.toFixed(
                2
              )}, Platform Commission: INR ${platformCommission.toFixed(2)})`,
              debit: sellerTotal,
              credit: netSellerPayout,
            },
            type: QueryTypes.INSERT,
            transaction: t,
          }
        )
        .catch(() => {});

      // i. Seller In-App Notification
      await Notification.create(
        {
          tenantId: sellerTenantId,
          userId: sellerTenantId,
          title: `New Sales Order Received #${sellerOrder.orderNumber}`,
          content: `Customer ${sellerCustomer.fullName} placed an order of INR ${sellerTotal.toFixed(
            2
          )}. Net Earnings credited to wallet: INR ${netSellerPayout.toFixed(2)}.`,
          type: 'ORDER_STATUS',
          channel: 'in_app',
          status: 'unread',
        } as any,
        { transaction: t }
      ).catch(() => {});

      logger.info(
        `[MarketplaceCheckoutService] Successfully synchronized Seller Sales Order #${sellerOrder.orderNumber} for Seller Tenant #${sellerTenantId}`
      );
    }
  }
}
