/* eslint-disable @typescript-eslint/no-explicit-any */
import { InvoiceRepository } from '../repositories/invoice.repository';
import { OrderRepository } from '../repositories/order.repository';
import { Invoice, Order } from '../database/models';
import { BaseService } from '../core/BaseService';
import { sequelize } from '../config/database';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { Op } from 'sequelize';

export class InvoiceService extends BaseService {
  private invoiceRepo = new InvoiceRepository();
  private orderRepo = new OrderRepository();

  constructor() {
    super('InvoiceService');
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
   * Generates a sequential concurrency-safe invoice number per tenant and store.
   */
  private async generateInvoiceNumber(
    tenantId: number,
    storeId: number,
    transaction: any
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await this.invoiceRepo.findScopedOne(tenantId, storeId, {
      where: {
        invoiceNumber: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [['id', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    let sequence = 1;
    if (latest) {
      const match = latest.invoiceNumber.substring(prefix.length);
      const parsed = parseInt(match, 10);
      if (!isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    const padded = String(sequence).padStart(6, '0');
    return `${prefix}${padded}`;
  }

  /**
   * Creates a snapshotted Invoice for an Order.
   */
  public async createInvoice(
    tenantId: number,
    storeId: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string,
    options?: { transaction?: any }
  ): Promise<Invoice> {
    const parentTx = options?.transaction;

    const execute = async (t: any) => {
      const order = await this.orderRepo.findScopedById(tenantId, storeId, data.orderId, {
        transaction: t,
      });
      if (!order) {
        throw new NotFoundError(`Order with ID ${data.orderId} not found.`);
      }

      // Check if an active (issued or paid) invoice already exists for this order
      const existing = await this.invoiceRepo.findScopedOne(tenantId, storeId, {
        where: {
          orderId: data.orderId,
          invoiceStatus: {
            [Op.in]: ['issued', 'paid'],
          },
        },
        transaction: t,
      });

      if (existing) {
        throw new ValidationError('An active invoice already exists for this order.');
      }

      const invoiceNumber = await this.generateInvoiceNumber(tenantId, storeId, t);

      return this.invoiceRepo.createScoped(
        tenantId,
        storeId,
        {
          orderId: data.orderId,
          invoiceNumber,
          invoiceStatus: 'draft',
          subtotal: Number(order.subtotal),
          tax: Number(order.taxAmount),
          discount: Number(order.discountAmount),
          total: Number(order.totalAmount),
          issuedAt: data.issuedAt || new Date(),
          dueDate: data.dueDate
            ? new Date(data.dueDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          paidAt: data.invoiceStatus === 'paid' ? new Date() : null,
        },
        { transaction: t }
      );
    };

    let invoice: any;
    if (parentTx) {
      invoice = await execute(parentTx);
    } else {
      invoice = await this.runWithRetry(async () => {
        return sequelize.transaction(async (t) => execute(t));
      });
    }

    try {
      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'INVOICE_CREATED',
          entityType: 'Invoice',
          entityId: String(invoice.id),
          previousValues: null,
          newValues: typeof invoice.toJSON === 'function' ? invoice.toJSON() : invoice,
        },
        { ipAddress: ip, userAgent } as any
      );
    } catch {
      // ignore non-critical audit log errors
    }

    return invoice;
  }

  /**
   * Retrieves an Invoice.
   */
  public async getInvoice(tenantId: number, storeId: number, id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findScopedById(tenantId, storeId, id, {
      include: [{ model: Order, as: 'order' }],
    });
    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${id} not found.`);
    }
    return invoice;
  }

  /**
   * Lists and searches Invoices.
   */
  public async listInvoices(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: Invoice[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      invoiceNumber,
      invoiceStatus,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (invoiceNumber) where.invoiceNumber = { [Op.like]: `%${invoiceNumber}%` };
    if (invoiceStatus) where.invoiceStatus = invoiceStatus;

    const sortWhitelist = ['createdAt', 'invoiceNumber', 'total'];
    const orderField = sortWhitelist.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    where.tenantId = tenantId;
    if (storeId && storeId !== 1) {
      where.storeId = storeId;
    }

    return Invoice.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[orderField, orderDirection]],
      include: [{ model: Order, as: 'order' }],
    });
  }

  /**
   * Updates an Invoice's status.
   */
  public async updateInvoice(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Invoice> {
    const invoice = await this.getInvoice(tenantId, storeId, id);

    // Paid invoices cannot be modified
    if (invoice.invoiceStatus === 'paid') {
      throw new ValidationError('Paid invoices cannot be modified.');
    }

    const oldValues = invoice.toJSON();

    const updateData: any = {};
    if (data.invoiceStatus) {
      updateData.invoiceStatus = data.invoiceStatus;
      if (data.invoiceStatus === 'issued') {
        updateData.issuedAt = new Date();
      } else if (data.invoiceStatus === 'paid') {
        updateData.paidAt = new Date();
      }
    }

    await this.invoiceRepo.updateScoped(tenantId, storeId, id, updateData);

    const updated = await this.getInvoice(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'INVOICE_UPDATED',
        entityType: 'Invoice',
        entityId: String(id),
        previousValues: oldValues,
        newValues: updated.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    return updated;
  }
}
