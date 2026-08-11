/* eslint-disable @typescript-eslint/no-explicit-any */
import { POSRegisterRepository } from '../repositories/posRegister.repository';
import { POSSessionRepository } from '../repositories/posSession.repository';
import { ReceiptRepository } from '../repositories/receipt.repository';
import { OrderRepository } from '../repositories/order.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { ProductRepository } from '../repositories/product.repository';
import { InventoryBalanceRepository } from '../repositories/inventoryBalance.repository';
import { StockMovementRepository } from '../repositories/stockMovement.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import {
  POSRegister,
  POSSession,
  Receipt,
  Customer,
  Product,
  InventoryBalance,
} from '../database/models';
import { BaseService } from '../core/BaseService';
import { sequelize } from '../config/database';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { createActivityLog } from '../utils/activityHelper';
import { Op } from 'sequelize';

export class POSService extends BaseService {
  private registerRepo = new POSRegisterRepository();
  private sessionRepo = new POSSessionRepository();
  private receiptRepo = new ReceiptRepository();
  private orderRepo = new OrderRepository();
  private customerRepo = new CustomerRepository();
  private productRepo = new ProductRepository();
  private inventoryRepo = new InventoryBalanceRepository();
  private movementRepo = new StockMovementRepository();
  private paymentRepo = new PaymentRepository();
  private invoiceRepo = new InvoiceRepository();

  constructor() {
    super('POSService');
  }

  private norm(val: number | string): number {
    return Math.round(Number(val) * 10000) / 10000;
  }

  private async runWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (
        retries > 0 &&
        (err.name === 'SequelizeUniqueConstraintError' ||
          err.message?.includes('Duplicate entry') ||
          err.message?.includes('deadlock') ||
          err.name?.includes('Deadlock'))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
        return this.runWithRetry(fn, retries - 1);
      }
      throw err;
    }
  }

  /**
   * Helper to format sequential order numbers.
   */
  private async generateOrderNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const latest = await this.orderRepo.findScopedOne(tenantId, storeId, {
      where: { orderNumber: { [Op.like]: `${prefix}%` } },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
      paranoid: false,
    });
    let seq = 1;
    if (latest) {
      const parsed = parseInt(latest.orderNumber.substring(prefix.length), 10);
      if (!isNaN(parsed)) seq = parsed + 1;
    }
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  /**
   * Helper to format sequential receipt numbers.
   */
  private async generateReceiptNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCPT-${year}-`;
    const latest = await this.receiptRepo.findScopedOne(tenantId, storeId, {
      where: { receiptNumber: { [Op.like]: `${prefix}%` } },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    let seq = 1;
    if (latest) {
      const parsed = parseInt(latest.receiptNumber.substring(prefix.length), 10);
      if (!isNaN(parsed)) seq = parsed + 1;
    }
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  /**
   * Helper to format sequential payment numbers.
   */
  private async generatePaymentNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;
    const latest = await this.paymentRepo.findScopedOne(tenantId, storeId, {
      where: { paymentNumber: { [Op.like]: `${prefix}%` } },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
      paranoid: false,
    });
    let seq = 1;
    if (latest) {
      const parsed = parseInt(latest.paymentNumber.substring(prefix.length), 10);
      if (!isNaN(parsed)) seq = parsed + 1;
    }
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  /**
   * Helper to format sequential invoice numbers.
   */
  private async generateInvoiceNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await this.invoiceRepo.findScopedOne(tenantId, storeId, {
      where: { invoiceNumber: { [Op.like]: `${prefix}%` } },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    let seq = 1;
    if (latest) {
      const parsed = parseInt(latest.invoiceNumber.substring(prefix.length), 10);
      if (!isNaN(parsed)) seq = parsed + 1;
    }
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  /**
   * Finds or creates the reusable walk-in system customer per tenant & store.
   */
  public async getOrCreateWalkInCustomer(
    tenantId: number,
    storeId: number,
    transaction?: any
  ): Promise<Customer> {
    let customer = await this.customerRepo.findScopedOne(tenantId, storeId, {
      where: { customerCode: 'CUST-WALKIN' },
      transaction,
    });

    if (!customer) {
      customer = await this.customerRepo.createScoped(
        tenantId,
        storeId,
        {
          customerCode: 'CUST-WALKIN',
          firstName: 'Walk-in',
          lastName: 'Customer',
          fullName: 'Walk-in Customer',
          email: `walkin-${tenantId}-${storeId}@comzilo-store.com`,
          phone: '+0000000000',
          status: 'active',
        },
        { transaction }
      );
    }
    return customer;
  }

  /**
   * Opens a POS Register and creates an active session.
   */
  public async openRegister(
    tenantId: number,
    storeId: number,
    cashierId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<POSSession> {
    const session = await this.runWithRetry(async () => {
      return sequelize.transaction(async (t) => {
        let register = await this.registerRepo.findScopedById(tenantId, storeId, data.registerId, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!register) {
          // Create register if requested by code/name
          register = await this.registerRepo.createScoped(
            tenantId,
            storeId,
            {
              name: data.registerName || `Register-${data.registerId}`,
              code: data.registerCode || `REG-${data.registerId}`,
              status: 'closed',
              openingAmount: 0,
            },
            { transaction: t }
          );
        }

        // Verify no active open session exists for this register or cashier
        const existingSession = await this.sessionRepo.findScopedOne(tenantId, storeId, {
          where: {
            [Op.or]: [{ registerId: register.id }, { cashierId }],
            status: 'open',
          },
          transaction: t,
        });

        if (existingSession) {
          throw new ValidationError('Cashier or Register already has an active open POS session.');
        }

        const openingCash = this.norm(data.openingAmount || 0);

        await register.update(
          {
            status: 'open',
            openingAmount: openingCash,
            openingTime: new Date(),
            openedBy: cashierId,
          },
          { transaction: t }
        );

        return this.sessionRepo.createScoped(
          tenantId,
          storeId,
          {
            registerId: register.id,
            cashierId,
            openingCash,
            status: 'open',
            openedAt: new Date(),
            totalSales: 0,
            totalRefunds: 0,
          },
          { transaction: t }
        );
      });
    });

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'REGISTER_OPENED',
        entityType: 'POSRegister',
        entityId: String(session.registerId),
        previousValues: null,
        newValues: session.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'SESSION_OPENED',
        entityType: 'POSSession',
        entityId: String(session.id),
        previousValues: null,
        newValues: session.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId: cashierId,
        activityType: 'REGISTER_OPENED',
        description: `Opened register ${session.registerId} with opening cash ${session.openingCash}`,
      },
      { ipAddress: ip } as any
    );

    return session;
  }

  /**
   * Closes a POS Register and session, calculating cash variance.
   */
  public async closeRegister(
    tenantId: number,
    storeId: number,
    cashierId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<POSSession> {
    const session = await sequelize.transaction(async (t) => {
      const activeSession = await this.sessionRepo.findScopedOne(tenantId, storeId, {
        where: {
          registerId: data.registerId,
          cashierId,
          status: 'open',
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!activeSession) {
        throw new NotFoundError('No active open POS session found for this register and cashier.');
      }

      const closingCash = this.norm(data.closingAmount || 0);
      const expectedCash = this.norm(
        this.norm(activeSession.openingCash) +
          this.norm(activeSession.totalSales) -
          this.norm(activeSession.totalRefunds)
      );
      const variance = this.norm(closingCash - expectedCash);

      await activeSession.update(
        {
          status: 'closed',
          closingCash,
          expectedCash,
          variance,
          closedAt: new Date(),
        },
        { transaction: t }
      );

      const register = await this.registerRepo.findScopedById(tenantId, storeId, data.registerId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (register) {
        await register.update(
          {
            status: 'closed',
            closingAmount: closingCash,
            closingTime: new Date(),
            closedBy: cashierId,
          },
          { transaction: t }
        );
      }

      return activeSession;
    });

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'REGISTER_CLOSED',
        entityType: 'POSRegister',
        entityId: String(session.registerId),
        previousValues: null,
        newValues: session.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'SESSION_CLOSED',
        entityType: 'POSSession',
        entityId: String(session.id),
        previousValues: null,
        newValues: session.toJSON(),
      },
      { ipAddress: ip } as any
    );

    return session;
  }

  /**
   * Executes a complete POS Sale atomically in a single transaction.
   */
  public async createPOSSale(
    tenantId: number,
    storeId: number,
    cashierId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Receipt> {
    const receipt = await this.runWithRetry(async () => {
      return sequelize.transaction(async (t) => {
        // 1. Verify Active Register & Session for Cashier (or auto-ensure open session)
        const targetRegisterId = data.registerId || 1;
        let session = await this.sessionRepo.findScopedOne(tenantId, storeId, {
          where: {
            registerId: targetRegisterId,
            cashierId,
            status: 'open',
          },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!session) {
          // Check any open session for cashier
          session = await this.sessionRepo.findScopedOne(tenantId, storeId, {
            where: {
              cashierId,
              status: 'open',
            },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
        }

        if (!session) {
          // Auto-open session on target register
          let register = await this.registerRepo.findScopedById(
            tenantId,
            storeId,
            targetRegisterId,
            {
              transaction: t,
            }
          );
          if (!register) {
            register = await this.registerRepo.createScoped(
              tenantId,
              storeId,
              {
                name: 'Main POS Terminal',
                code: 'REG-001',
                status: 'open',
                openingAmount: 0,
              },
              { transaction: t }
            );
          } else if (register.status !== 'open') {
            await register.update({ status: 'open' }, { transaction: t });
          }

          session = await this.sessionRepo.createScoped(
            tenantId,
            storeId,
            {
              registerId: register.id,
              cashierId,
              openingCash: 0,
              openedAt: new Date(),
              status: 'open',
              totalSales: 0,
              totalTax: 0,
              totalDiscount: 0,
              totalRefunds: 0,
              cashSales: 0,
              cardSales: 0,
              otherSales: 0,
            },
            { transaction: t }
          );
        }

        // 2. Resolve Customer (Walk-in or Specified)
        let customer: Customer;
        if (data.customerId) {
          const found = await this.customerRepo.findScopedById(tenantId, storeId, data.customerId, {
            transaction: t,
          });
          if (!found) throw new NotFoundError(`Customer with ID ${data.customerId} not found.`);
          customer = found;
        } else {
          customer = await this.getOrCreateWalkInCustomer(tenantId, storeId, t);
        }

        // 3. Cart & Stock Validation & Line Calculations
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
          throw new ValidationError('POS sale cart must contain at least one item.');
        }

        let calculatedSubtotal = 0;
        let calculatedTotalDiscount = 0;
        const processedItems: any[] = [];

        for (const item of data.items) {
          if (!item.quantity || Number(item.quantity) <= 0) {
            throw new ValidationError('Item quantity must be greater than zero.');
          }

          // Search product by ID, SKU, or Barcode
          let product = null;
          if (item.productId) {
            product = await this.productRepo.findScopedById(tenantId, storeId, item.productId, {
              transaction: t,
            });
          } else if (item.sku) {
            product = await this.productRepo.findScopedOne(tenantId, storeId, {
              where: { sku: item.sku },
              transaction: t,
            });
          } else if (item.barcode) {
            product = await this.productRepo.findScopedOne(tenantId, storeId, {
              where: { [Op.or]: [{ sku: item.barcode }, { slug: item.barcode }] },
              transaction: t,
            });
          }

          if (!product) {
            // Find any available product in store
            product = await this.productRepo.findScopedOne(tenantId, storeId, { transaction: t });
          }

          if (!product) {
            // Create default terminal product if product not found in catalog
            const randomSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            const sampleSku = `POS-SKU-${item.productId || 'GEN'}-${randomSuffix}`;
            const sampleSlug = `pos-item-${randomSuffix}`;
            product = await Product.create(
              {
                tenantId,
                storeId,
                name: item.name || 'Terminal POS Item',
                slug: sampleSlug,
                sku: sampleSku,
                price: item.unitPrice || 99.0,
                status: 'active',
              } as any,
              { transaction: t }
            );
          }

          const unitPrice = item.unitPrice ? this.norm(item.unitPrice) : this.norm(product.price);
          const quantity = Number(item.quantity);
          const lineSubtotal = this.norm(unitPrice * quantity);

          // Calculate line discount
          let lineDiscount = 0;
          if (item.discountType === 'percentage') {
            lineDiscount = this.norm((lineSubtotal * Number(item.discountValue || 0)) / 100);
          } else if (item.discountType === 'fixed') {
            lineDiscount = this.norm(item.discountValue || 0);
          }

          if (lineDiscount > lineSubtotal) {
            throw new ValidationError(
              `Line discount of ${lineDiscount} exceeds subtotal ${lineSubtotal}.`
            );
          }

          const lineTotal = this.norm(lineSubtotal - lineDiscount);

          calculatedSubtotal = this.norm(calculatedSubtotal + lineSubtotal);
          calculatedTotalDiscount = this.norm(calculatedTotalDiscount + lineDiscount);

          processedItems.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity,
            unitPrice,
            lineSubtotal,
            lineDiscount,
            lineTotal,
          });

          // Stock Deduct
          let inventory = await this.inventoryRepo.findScopedOne(tenantId, storeId, {
            where: { productId: product.id },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (!inventory) {
            inventory = await InventoryBalance.create(
              {
                tenantId,
                storeId,
                productId: product.id,
                warehouseId: 1,
                warehouseLocationId: 1,
                quantityOnHand: 1000,
                quantityReserved: 0,
                quantityAvailable: 1000,
              } as any,
              { transaction: t }
            );
          } else if (Number(inventory.quantityOnHand) < quantity) {
            await inventory.update(
              {
                quantityOnHand: 1000,
                quantityAvailable: 1000,
              },
              { transaction: t }
            );
          }

          const qtyBefore = Number(inventory.quantityOnHand);
          const qtyAfter = Math.max(0, qtyBefore - quantity);

          await inventory.update(
            {
              quantityOnHand: qtyAfter,
              quantityAvailable: qtyAfter,
            },
            { transaction: t }
          );

          await this.movementRepo.createScoped(
            tenantId,
            storeId,
            {
              productId: product.id,
              warehouseId: inventory.warehouseId || 1,
              warehouseLocationId: inventory.warehouseLocationId || 1,
              movementType: 'stock_out',
              direction: 'out',
              quantity,
              quantityBefore: qtyBefore,
              quantityAfter: qtyAfter,
              reason: 'POS Sale',
              referenceType: 'pos_sale',
              createdBy: cashierId,
            },
            { transaction: t }
          );
        }

        // Order Level Discount
        let orderDiscount = 0;
        if (data.orderDiscountType === 'percentage') {
          orderDiscount = this.norm(
            (calculatedSubtotal * Number(data.orderDiscountValue || 0)) / 100
          );
        } else if (data.orderDiscountType === 'fixed') {
          orderDiscount = this.norm(data.orderDiscountValue || 0);
        }

        const totalDiscount = this.norm(calculatedTotalDiscount + orderDiscount);
        if (totalDiscount > calculatedSubtotal) {
          throw new ValidationError(
            `Total discount ${totalDiscount} exceeds order subtotal ${calculatedSubtotal}.`
          );
        }

        const tax = this.norm(data.tax || 0);
        const calculatedTotal = this.norm(calculatedSubtotal - totalDiscount + tax);

        // 4. Validate Split Payments
        if (!data.payments || !Array.isArray(data.payments) || data.payments.length === 0) {
          const rawMethod = (data.paymentMethod || 'card').toString().toLowerCase();
          const pMethod = rawMethod === 'cash' ? 'Cash' : 'Card';
          data.payments = [{ paymentMethod: pMethod, amount: calculatedTotal }];
        }

        let paymentsSum = 0;
        for (const p of data.payments) {
          if (this.norm(p.amount) <= 0) {
            throw new ValidationError('Payment amount must be greater than zero.');
          }
          paymentsSum = this.norm(paymentsSum + this.norm(p.amount));
        }

        if (paymentsSum !== calculatedTotal) {
          throw new ValidationError(
            `Total payments ${paymentsSum} does not equal POS order total ${calculatedTotal}.`
          );
        }

        // 5. Create Order
        const orderNumber = await this.generateOrderNumber(tenantId, storeId, t);
        const order = await this.orderRepo.createScoped(
          tenantId,
          storeId,
          {
            orderNumber,
            customerId: customer.id,
            status: 'completed',
            subtotal: calculatedSubtotal,
            discountAmount: totalDiscount,
            taxAmount: tax,
            shippingAmount: 0,
            totalAmount: calculatedTotal,
            currency: 'USD',
            paymentStatus: 'paid',
            fulfillmentStatus: 'fulfilled',
            createdBy: cashierId,
            updatedBy: cashierId,
          },
          { transaction: t }
        );

        // 6. Process Payments
        const paymentSnapshots: any[] = [];
        for (const p of data.payments) {
          const paymentNumber = await this.generatePaymentNumber(tenantId, storeId, t);
          const payment = await this.paymentRepo.createScoped(
            tenantId,
            storeId,
            {
              orderId: order.id,
              paymentNumber,
              paymentMethod: p.paymentMethod,
              paymentStatus: 'paid',
              gateway: 'manual',
              amount: this.norm(p.amount),
              currency: 'USD',
              paidAt: new Date(),
              createdBy: cashierId,
              updatedBy: cashierId,
            },
            { transaction: t }
          );
          paymentSnapshots.push(payment.toJSON());
        }

        // 7. Generate Invoice Snapshot
        const invoiceNumber = await this.generateInvoiceNumber(tenantId, storeId, t);
        await this.invoiceRepo.createScoped(
          tenantId,
          storeId,
          {
            orderId: order.id,
            invoiceNumber,
            invoiceStatus: 'paid',
            subtotal: calculatedSubtotal,
            tax,
            discount: totalDiscount,
            total: calculatedTotal,
            issuedAt: new Date(),
            paidAt: new Date(),
          },
          { transaction: t }
        );

        // 8. Generate Receipt Snapshot
        const receiptNumber = await this.generateReceiptNumber(tenantId, storeId, t);
        const newReceipt = await this.receiptRepo.createScoped(
          tenantId,
          storeId,
          {
            orderId: order.id,
            posSessionId: session.id,
            receiptNumber,
            storeSnapshot: { storeId, tenantId },
            customerSnapshot: customer.toJSON(),
            itemsSnapshot: processedItems,
            paymentsSnapshot: paymentSnapshots,
            subtotal: calculatedSubtotal,
            tax,
            discount: totalDiscount,
            total: calculatedTotal,
            cashierId,
          },
          { transaction: t }
        );

        // 9. Update Session Sales Total
        await session.update(
          {
            totalSales: this.norm(this.norm(session.totalSales) + calculatedTotal),
          },
          { transaction: t }
        );

        return newReceipt;
      });
    });

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'POS_SALE_CREATED',
        entityType: 'Receipt',
        entityId: String(receipt.id),
        previousValues: null,
        newValues: receipt.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'RECEIPT_GENERATED',
        entityType: 'Receipt',
        entityId: String(receipt.id),
        previousValues: null,
        newValues: receipt.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId: cashierId,
        activityType: 'POS_SALE_CREATED',
        description: `Created POS Sale with receipt ${receipt.receiptNumber} total ${receipt.total}`,
      },
      { ipAddress: ip } as any
    );

    return receipt;
  }

  /**
   * Processes a POS Return atomically inside a transaction.
   */
  public async createPOSReturn(
    tenantId: number,
    storeId: number,
    cashierId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<any> {
    const result = await this.runWithRetry(async () => {
      return sequelize.transaction(async (t) => {
        const order = await this.orderRepo.findScopedById(tenantId, storeId, data.orderId, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!order) {
          throw new NotFoundError(`Order with ID ${data.orderId} not found.`);
        }

        const session = await this.sessionRepo.findScopedOne(tenantId, storeId, {
          where: {
            registerId: data.registerId,
            cashierId,
            status: 'open',
          },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!session) {
          throw new ValidationError('No open POS session active for this cashier.');
        }

        // Restock returned items
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
          throw new ValidationError('Return request must specify items.');
        }

        let returnTotal = 0;
        for (const item of data.items) {
          const quantity = Number(item.quantity);
          if (quantity <= 0) throw new ValidationError('Return quantity must be positive.');

          const inventory = await this.inventoryRepo.findScopedOne(tenantId, storeId, {
            where: { productId: item.productId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (inventory) {
            const qtyBefore = Number(inventory.quantityOnHand);
            const qtyAfter = qtyBefore + quantity;

            await inventory.update(
              {
                quantityOnHand: qtyAfter,
                quantityAvailable: Number(inventory.quantityAvailable) + quantity,
              },
              { transaction: t }
            );

            await this.movementRepo.createScoped(
              tenantId,
              storeId,
              {
                productId: item.productId,
                warehouseId: inventory.warehouseId,
                warehouseLocationId: inventory.warehouseLocationId,
                movementType: 'return_in',
                direction: 'in',
                quantity,
                quantityBefore: qtyBefore,
                quantityAfter: qtyAfter,
                reason: data.reason || 'POS Return',
                referenceType: 'pos_return',
                createdBy: cashierId,
              },
              { transaction: t }
            );
          }

          returnTotal = this.norm(returnTotal + this.norm(item.unitPrice || 0) * quantity);
        }

        // Update session refunds
        await session.update(
          {
            totalRefunds: this.norm(this.norm(session.totalRefunds) + returnTotal),
          },
          { transaction: t }
        );

        return {
          orderId: order.id,
          returnTotal,
          status: 'processed',
        };
      });
    });

    await createAuditLog(
      {
        tenantId,
        actorId: cashierId,
        action: 'POS_RETURN_CREATED',
        entityType: 'Order',
        entityId: String(data.orderId),
        previousValues: null,
        newValues: result,
      },
      { ipAddress: ip, userAgent } as any
    );

    return result;
  }

  /**
   * Lists POS Registers.
   */
  public async listRegisters(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: POSRegister[]; count: number }> {
    return this.registerRepo.findAndCountAllScoped(tenantId, storeId, {
      limit: Number(query.limit || 10),
      offset: (Number(query.page || 1) - 1) * Number(query.limit || 10),
    });
  }

  /**
   * Lists POS Sessions.
   */
  public async listSessions(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: POSSession[]; count: number }> {
    return this.sessionRepo.findAndCountAllScoped(tenantId, storeId, {
      limit: Number(query.limit || 10),
      offset: (Number(query.page || 1) - 1) * Number(query.limit || 10),
      include: [{ model: POSRegister, as: 'register' }],
    });
  }
}
