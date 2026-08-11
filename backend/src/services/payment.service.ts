/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { OrderRepository } from '../repositories/order.repository';
import { Payment, Refund, Order } from '../database/models';
import { BaseService } from '../core/BaseService';
import { sequelize } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { createActivityLog } from '../utils/activityHelper';
import { PaymentProviderFactory } from './payment/provider.factory';
import { Op } from 'sequelize';

export class PaymentService extends BaseService {
  private paymentRepo = new PaymentRepository();
  private refundRepo = new RefundRepository();
  private orderRepo = new OrderRepository();

  constructor() {
    super('PaymentService');
  }

  /**
   * Helper function for precision financial rounding (4 decimal places).
   */
  private norm(val: number | string): number {
    return Math.round(Number(val) * 10000) / 10000;
  }

  /**
   * Concurrency-safe helper that runs transaction blocks with retry.
   */
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
   * Generates a sequential concurrency-safe payment number per tenant and store.
   */
  private async generatePaymentNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;

    const latest = await this.paymentRepo.findScopedOne(tenantId, storeId, {
      where: {
        paymentNumber: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
      paranoid: false,
    });

    let sequence = 1;
    if (latest) {
      const match = latest.paymentNumber.substring(prefix.length);
      const parsed = parseInt(match, 10);
      if (!isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    const padded = String(sequence).padStart(6, '0');
    return `${prefix}${padded}`;
  }

  /**
   * Generates a sequential concurrency-safe refund number per tenant and store.
   */
  private async generateRefundNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REF-${year}-`;

    const latest = await this.refundRepo.findScopedOne(tenantId, storeId, {
      where: {
        refundNumber: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    let sequence = 1;
    if (latest) {
      const match = latest.refundNumber.substring(prefix.length);
      const parsed = parseInt(match, 10);
      if (!isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    const padded = String(sequence).padStart(6, '0');
    return `${prefix}${padded}`;
  }

  /**
   * Validates legal transitions in the payment status transition matrix.
   */
  private checkTransition(from: string, to: string) {
    const allowed: Record<string, string[]> = {
      pending: ['authorized', 'paid', 'failed', 'cancelled'],
      authorized: ['paid', 'failed', 'cancelled'],
      paid: ['partially_refunded', 'refunded'],
      partially_refunded: ['partially_refunded', 'refunded'],
    };
    if (!allowed[from] || !allowed[from].includes(to)) {
      throw new ValidationError(`Illegal payment status transition from '${from}' to '${to}'.`);
    }
  }

  /**
   * Recalculates and updates the Order payment status.
   */
  private async updateOrderPaymentStatus(
    tenantId: number,
    storeId: number,
    orderId: number,
    transaction: any
  ): Promise<void> {
    const order = await this.orderRepo.findScopedById(tenantId, storeId, orderId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!order) return;

    // Get all captured/paid/refunded payments for this order
    const payments = await this.paymentRepo.findScopedMany(tenantId, storeId, {
      where: {
        orderId,
        paymentStatus: {
          [Op.in]: ['paid', 'partially_refunded', 'refunded'],
        },
      },
      transaction,
    });

    const totalCaptured = payments.reduce((sum, p) => this.norm(sum + this.norm(p.amount)), 0);

    // Get all processed refunds for those payments
    const paymentIds = payments.map((p) => p.id);
    let totalRefunded = 0;
    if (paymentIds.length > 0) {
      const refunds = await this.refundRepo.findScopedMany(tenantId, storeId, {
        where: {
          paymentId: {
            [Op.in]: paymentIds,
          },
          status: 'processed',
        },
        transaction,
      });
      totalRefunded = refunds.reduce((sum, r) => this.norm(sum + this.norm(r.amount)), 0);
    }

    let status: 'unpaid' | 'partially_paid' | 'paid' | 'refunded' = 'unpaid';
    const netCaptured = this.norm(totalCaptured - totalRefunded);

    if (totalCaptured > 0) {
      if (totalRefunded >= totalCaptured) {
        status = 'refunded';
      } else if (netCaptured >= this.norm(order.totalAmount)) {
        status = 'paid';
      } else {
        status = 'partially_paid';
      }
    }

    await order.update({ paymentStatus: status }, { transaction: transaction });
  }

  /**
   * Creates a payment in pending status.
   */
  public async createPayment(
    tenantId: number,
    storeId: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Payment> {
    if (this.norm(data.amount) <= 0) {
      throw new ValidationError('Payment amount must be greater than zero.');
    }

    // Process idempotency check first
    if (data.idempotencyKey) {
      const existing = await this.paymentRepo.findScopedOne(tenantId, storeId, {
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        const matchesPayload =
          existing.orderId === Number(data.orderId) &&
          this.norm(existing.amount) === this.norm(data.amount) &&
          existing.paymentMethod === data.paymentMethod &&
          existing.currency === (data.currency || 'USD');

        if (matchesPayload) {
          return existing;
        }
        throw new ConflictError(
          'Conflict: A payment with this idempotency key already exists with a different payload.'
        );
      }
    }

    const payment = await this.runWithRetry(async () => {
      return sequelize.transaction(async (t) => {
        const order = await this.orderRepo.findScopedById(tenantId, storeId, data.orderId, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!order) {
          throw new NotFoundError(`Order with ID ${data.orderId} not found.`);
        }

        // Verify currency match
        if (order.currency !== (data.currency || 'USD')) {
          throw new ValidationError(
            `Payment currency '${data.currency || 'USD'}' does not match Order currency '${order.currency}'.`
          );
        }

        // Calculate outstanding balance
        const existingPayments = await this.paymentRepo.findScopedMany(tenantId, storeId, {
          where: {
            orderId: data.orderId,
            paymentStatus: {
              [Op.in]: ['paid', 'partially_refunded', 'authorized', 'pending'],
            },
          },
          transaction: t,
        });

        const totalExisting = existingPayments.reduce(
          (sum, p) => this.norm(sum + this.norm(p.amount)),
          0
        );
        const outstanding = this.norm(this.norm(order.totalAmount) - totalExisting);

        if (this.norm(data.amount) > outstanding) {
          throw new ValidationError(
            `Payment amount of ${data.amount} exceeds the outstanding balance of ${outstanding}.`
          );
        }

        const paymentNumber = await this.generatePaymentNumber(tenantId, storeId, t);

        return this.paymentRepo.createScoped(
          tenantId,
          storeId,
          {
            orderId: data.orderId,
            paymentNumber,
            paymentMethod: data.paymentMethod,
            paymentStatus: 'pending',
            gateway: data.gateway || 'manual',
            amount: this.norm(data.amount),
            currency: data.currency || 'USD',
            exchangeRate: this.norm(data.exchangeRate || 1),
            notes: data.notes || null,
            metadata: data.metadata || null,
            idempotencyKey: data.idempotencyKey || null,
            createdBy: userId,
            updatedBy: userId,
          },
          { transaction: t }
        );
      });
    });

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'PAYMENT_CREATED',
        entityType: 'Payment',
        entityId: String(payment.id),
        previousValues: null,
        newValues: payment.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'PAYMENT_CREATED',
        description: `Created payment ${payment.paymentNumber} for order ${payment.orderId}`,
      },
      { ipAddress: ip } as any
    );

    return this.getPayment(tenantId, storeId, payment.id);
  }

  /**
   * Retrieves a Payment.
   */
  public async getPayment(tenantId: number, storeId: number, id: number): Promise<Payment> {
    const payment = await this.paymentRepo.findScopedById(tenantId, storeId, id, {
      include: [{ model: Order, as: 'order' }],
    });
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${id} not found.`);
    }
    return payment;
  }

  /**
   * Lists and searches Payments.
   */
  public async listPayments(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: Payment[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      paymentNumber,
      paymentStatus,
      paymentMethod,
      gatewayReference,
      transactionReference,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (paymentNumber) where.paymentNumber = { [Op.like]: `%${paymentNumber}%` };
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (gatewayReference) where.gatewayReference = { [Op.like]: `%${gatewayReference}%` };
    if (transactionReference)
      where.transactionReference = { [Op.like]: `%${transactionReference}%` };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount[Op.gte] = Number(minAmount);
      if (maxAmount) where.amount[Op.lte] = Number(maxAmount);
    }

    const sortWhitelist = ['createdAt', 'paymentNumber', 'amount', 'paymentStatus'];
    const orderField = sortWhitelist.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    where.tenantId = tenantId;
    if (storeId && storeId !== 1) {
      where.storeId = storeId;
    }

    return Payment.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[orderField, orderDirection]],
      include: [{ model: Order, as: 'order' }],
    });
  }

  /**
   * Authorizes a Payment.
   */
  public async authorizePayment(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Payment> {
    const payment = await this.getPayment(tenantId, storeId, id);
    this.checkTransition(payment.paymentStatus, 'authorized');

    const oldValues = payment.toJSON();

    await sequelize.transaction(async (t) => {
      const provider = PaymentProviderFactory.getProvider(payment.gateway);
      const response = await provider.authorize(this.norm(payment.amount), payment.currency, {
        gatewayReference: payment.gatewayReference,
      });

      if (!response.success) {
        throw new ValidationError(response.error || 'Payment authorization failed.');
      }

      await payment.update(
        {
          paymentStatus: 'authorized',
          gatewayReference: response.gatewayReference,
          transactionReference: response.transactionReference,
          updatedBy: userId,
        },
        { transaction: t }
      );
    });

    const updated = await this.getPayment(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'PAYMENT_AUTHORIZED',
        entityType: 'Payment',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'PAYMENT_AUTHORIZED',
        description: `Authorized payment ${updated.paymentNumber}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  /**
   * Captures a Payment (Paid).
   */
  public async capturePayment(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Payment> {
    const payment = await this.getPayment(tenantId, storeId, id);
    this.checkTransition(payment.paymentStatus, 'paid');

    const oldValues = payment.toJSON();

    await sequelize.transaction(async (t) => {
      const provider = PaymentProviderFactory.getProvider(payment.gateway);
      const response = await provider.capture(
        payment.transactionReference || '',
        this.norm(payment.amount),
        {
          gatewayReference: payment.gatewayReference,
        }
      );

      if (!response.success) {
        throw new ValidationError(response.error || 'Payment capture failed.');
      }

      await payment.update(
        {
          paymentStatus: 'paid',
          gatewayReference: response.gatewayReference,
          transactionReference: response.transactionReference,
          paidAt: new Date(),
          updatedBy: userId,
        },
        { transaction: t }
      );

      await this.updateOrderPaymentStatus(tenantId, storeId, payment.orderId, t);
    });

    const updated = await this.getPayment(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'PAYMENT_CAPTURED',
        entityType: 'Payment',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'PAYMENT_CAPTURED',
        description: `Captured payment ${updated.paymentNumber}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  /**
   * Fails a Payment.
   */
  public async failPayment(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Payment> {
    const payment = await this.getPayment(tenantId, storeId, id);
    this.checkTransition(payment.paymentStatus, 'failed');

    const oldValues = payment.toJSON();

    await payment.update({
      paymentStatus: 'failed',
      updatedBy: userId,
    });

    const updated = await this.getPayment(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'PAYMENT_FAILED',
        entityType: 'Payment',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    return updated;
  }

  /**
   * Cancels a Payment.
   */
  public async cancelPayment(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Payment> {
    const payment = await this.getPayment(tenantId, storeId, id);
    this.checkTransition(payment.paymentStatus, 'cancelled');

    const oldValues = payment.toJSON();

    await sequelize.transaction(async (t) => {
      const provider = PaymentProviderFactory.getProvider(payment.gateway);
      await provider.cancel(payment.transactionReference || '', {
        gatewayReference: payment.gatewayReference,
      });

      await payment.update(
        {
          paymentStatus: 'cancelled',
          updatedBy: userId,
        },
        { transaction: t }
      );
    });

    const updated = await this.getPayment(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'PAYMENT_CANCELLED',
        entityType: 'Payment',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    return updated;
  }

  /**
   * Processes a Refund (full or partial).
   */
  public async refundPayment(
    tenantId: number,
    storeId: number,
    paymentId: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Refund> {
    if (this.norm(data.amount) <= 0) {
      throw new ValidationError('Refund amount must be greater than zero.');
    }

    const refund = await this.runWithRetry(async () => {
      return sequelize.transaction(async (t) => {
        const payment = await this.paymentRepo.findScopedById(tenantId, storeId, paymentId, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!payment) {
          throw new NotFoundError(`Payment with ID ${paymentId} not found.`);
        }
        if (payment.paymentStatus !== 'paid' && payment.paymentStatus !== 'partially_refunded') {
          throw new ValidationError(
            `Cannot refund a payment with status '${payment.paymentStatus}'.`
          );
        }

        // Sum existing refunds
        const existingRefunds = await this.refundRepo.findScopedMany(tenantId, storeId, {
          where: {
            paymentId,
            status: 'processed',
          },
          transaction: t,
        });

        const totalRefunded = existingRefunds.reduce(
          (sum, r) => this.norm(sum + this.norm(r.amount)),
          0
        );
        const remaining = this.norm(this.norm(payment.amount) - totalRefunded);

        if (this.norm(data.amount) > remaining) {
          throw new ValidationError(
            `Refund amount of ${data.amount} exceeds the remaining captured amount of ${remaining}.`
          );
        }

        // Trigger Gateway Refund
        const provider = PaymentProviderFactory.getProvider(payment.gateway);
        const response = await provider.refund(
          payment.transactionReference || '',
          this.norm(data.amount),
          {
            gatewayReference: payment.gatewayReference,
          }
        );

        if (!response.success) {
          throw new ValidationError(response.error || 'Refund capture failed.');
        }

        const refundNumber = await this.generateRefundNumber(tenantId, storeId, t);

        const newRefund = await this.refundRepo.createScoped(
          tenantId,
          storeId,
          {
            paymentId,
            refundNumber,
            amount: this.norm(data.amount),
            reason: data.reason || null,
            status: 'processed',
            refundedAt: new Date(),
            createdBy: userId,
          },
          { transaction: t }
        );

        // Update payment status
        const totalRefundedPost = this.norm(totalRefunded + this.norm(data.amount));
        let paymentStatus: 'refunded' | 'partially_refunded' = 'partially_refunded';
        if (totalRefundedPost >= this.norm(payment.amount)) {
          paymentStatus = 'refunded';
        }

        await payment.update({ paymentStatus }, { transaction: t });

        // Update Order Status
        await this.updateOrderPaymentStatus(tenantId, storeId, payment.orderId, t);

        return newRefund;
      });
    });

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'REFUND_CREATED',
        entityType: 'Refund',
        entityId: String(refund.id),
        previousValues: null,
        newValues: refund.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'REFUND_COMPLETED',
        description: `Completed refund ${refund.refundNumber} of amount ${refund.amount}`,
      },
      { ipAddress: ip } as any
    );

    return refund;
  }

  /**
   * Retrieves a Refund.
   */
  public async getRefund(tenantId: number, storeId: number, id: number): Promise<Refund> {
    const refund = await this.refundRepo.findScopedById(tenantId, storeId, id);
    if (!refund) {
      throw new NotFoundError(`Refund with ID ${id} not found.`);
    }
    return refund;
  }

  /**
   * Lists and searches Refunds.
   */
  public async listRefunds(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: Refund[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      refundNumber,
      status,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (refundNumber) where.refundNumber = { [Op.like]: `%${refundNumber}%` };
    if (status) where.status = status;

    const sortWhitelist = ['createdAt', 'refundNumber', 'amount'];
    const orderField = sortWhitelist.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    where.tenantId = tenantId;
    if (storeId && storeId !== 1) {
      where.storeId = storeId;
    }

    return Refund.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[orderField, orderDirection]],
    });
  }
}
