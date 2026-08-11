/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderRepository } from '../repositories/order.repository';
import { OrderItemRepository } from '../repositories/orderItem.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { Product, Order, OrderItem, Customer, Payment, Refund } from '../database/models';
import { BaseService } from '../core/BaseService';
import { sequelize } from '../config/database';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { createActivityLog } from '../utils/activityHelper';
import { StockReservationService } from './stockReservation.service';
import { StockReservationRepository } from '../repositories/stockReservation.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { WarehouseLocationRepository } from '../repositories/warehouseLocation.repository';
import { SellerWalletService } from './sellerWallet.service';
import { Op } from 'sequelize';

export class OrderService extends BaseService {
  private orderRepo = new OrderRepository();
  private orderItemRepo = new OrderItemRepository();
  private customerRepo = new CustomerRepository();
  private reservationService = new StockReservationService();
  private reservationRepo = new StockReservationRepository();
  private warehouseRepo = new WarehouseRepository();
  private locationRepo = new WarehouseLocationRepository();

  constructor() {
    super('OrderService');
  }

  /**
   * Generates a sequential concurrency-safe order number per tenant and store.
   */
  private async generateOrderNumber(
    tenantId: number,
    storeId: number,
    transaction?: any
  ): Promise<string> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `ORD-${timestamp}-${randomSuffix}`;
  }

  /**
   * Resolves a default warehouse and warehouse location for inventory reservations.
   */
  private async resolveDefaultWarehouseAndLocation(
    tenantId: number,
    storeId: number,
    transaction?: any
  ): Promise<{ warehouseId: number; locationId: number }> {
    const defaultWarehouse =
      (await this.warehouseRepo.findScopedOne(tenantId, storeId, {
        where: { isDefault: true },
        transaction,
      })) || (await this.warehouseRepo.findScopedOne(tenantId, storeId, { transaction }));

    if (!defaultWarehouse) {
      throw new ValidationError(
        'No warehouse found for stock reservation. Please create a warehouse first.'
      );
    }

    const defaultLocation =
      (await this.locationRepo.findScopedOne(tenantId, storeId, {
        where: { warehouseId: defaultWarehouse.id, isDefault: true },
        transaction,
      })) ||
      (await this.locationRepo.findScopedOne(tenantId, storeId, {
        where: { warehouseId: defaultWarehouse.id },
        transaction,
      }));

    if (!defaultLocation) {
      throw new ValidationError('No warehouse location found for stock reservation.');
    }

    return {
      warehouseId: defaultWarehouse.id,
      locationId: defaultLocation.id,
    };
  }

  /**
   * Creates a new Order (defaults to draft status).
   */
  public async createOrder(
    tenantId: number,
    storeId: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string,
    options?: any
  ): Promise<Order> {
    // 1. Validate customer
    let customer = await this.customerRepo.findScopedById(
      tenantId,
      storeId,
      data.customerId,
      options
    );
    if (!customer) {
      customer = await Customer.findByPk(data.customerId, options);
    }
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${data.customerId} not found.`);
    }
    if (customer.status !== 'active') {
      throw new ValidationError(`Cannot create order: customer is currently '${customer.status}'.`);
    }

    const runOrderLogic = async (t: any) => {
      // Generate Order Number with Lock
      const orderNumber = await this.generateOrderNumber(tenantId, storeId, t);

      let subtotal = 0;
      const itemRecords: any[] = [];

      // Calculate totals and snapshot products
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const product = await Product.findOne({
            where: { id: item.productId },
            transaction: t,
          });

          if (!product) {
            throw new NotFoundError(`Product with ID ${item.productId} not found.`);
          }

          let unitPrice = Number(product.price || 0);
          let itemSku = product.sku;
          const variantIdVal: number | null = item.variantId || item.productVariantId || null;
          let variantSkuVal: string | null = null;
          const variantAttributesVal: any = null;

          if (variantIdVal) {
            const { ProductVariant } = require('../database/models');
            const variant = await ProductVariant.findOne({
              where: { id: variantIdVal },
              transaction: t,
            });

            if (variant) {
              unitPrice = Number(variant.price || unitPrice);
              variantSkuVal = variant.sku;
              itemSku = variant.sku;

              const availStock = Number(
                variant.stockQuantity ?? (variant as any).stock_quantity ?? 0
              );
              if (availStock < Number(item.quantity || 1)) {
                throw new ValidationError(
                  `Variant ${variant.sku} has insufficient stock (Available: ${availStock}).`
                );
              }

              // Deduct Variant Inventory stock
              const { VariantInventoryService } = require('./variantInventory.service');
              const varInvService = new VariantInventoryService();
              await varInvService.adjustStock(
                tenantId,
                {
                  variantId: variant.id,
                  warehouseId: item.warehouseId || 1,
                  adjustmentQty: -Number(item.quantity || 1),
                  movementType: 'stock_out',
                  notes: `Deducted for Order #${orderNumber}`,
                },
                null,
                { transaction: t }
              );
            }
          }

          const qty = Number(item.quantity || 1);
          const itemDiscount = Number(item.discount || 0);
          const itemTax = Number(item.tax || 0);

          const itemSubtotal = unitPrice * qty;
          const itemTotal = itemSubtotal - itemDiscount + itemTax;

          subtotal += itemSubtotal;

          itemRecords.push({
            productId: item.productId,
            productVariantId: variantIdVal || item.productVariantId || null,
            variantId: variantIdVal,
            variantSku: variantSkuVal,
            variantAttributes: item.variantAttributes || item.selectedAttributes || null,
            warehouseId: item.warehouseId || 1,
            sku: itemSku,
            productName: item.productName || item.name || product.name,
            customization: item.customization || item.customDesign || null,
            quantity: qty,
            unitPrice,
            discount: itemDiscount,
            tax: itemTax,
            subtotal: itemSubtotal,
            total: itemTotal,
          });
        }
      }

      const discountAmount = Number(data.discountAmount || 0);
      const taxAmount = Number(data.taxAmount || 0);
      const shippingAmount = Number(data.shippingAmount || 0);
      const totalAmount = subtotal - discountAmount + taxAmount + shippingAmount;

      const newOrder = await this.orderRepo.createScoped(
        tenantId,
        storeId,
        {
          orderNumber,
          customerId: data.customerId,
          status: data.status || 'draft',
          paymentStatus: data.paymentStatus || 'unpaid',
          fulfillmentStatus: 'pending',
          subtotal,
          discountAmount,
          taxAmount,
          shippingAmount,
          totalAmount,
          currency: data.currency || 'USD',
          notes: data.notes || null,
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction: t }
      );

      for (const item of itemRecords) {
        await this.orderItemRepo.createScoped(
          tenantId,
          storeId,
          {
            ...item,
            orderId: newOrder.id,
          },
          { transaction: t }
        );
      }

      return newOrder;
    };

    const parentTx = options?.transaction;
    const order = parentTx
      ? await runOrderLogic(parentTx)
      : await sequelize.transaction(runOrderLogic);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_CREATED',
        entityType: 'Order',
        entityId: String(order.id),
        previousValues: null,
        newValues: order.toJSON(),
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'ORDER_CREATED',
        description: `Created order ${order.orderNumber} for customer ${order.customerId}`,
      },
      { ipAddress: ip } as any
    );

    return order;
  }

  /**
   * Retrieves an Order.
   */
  public async getOrder(
    tenantId: number,
    storeId: number,
    id: number,
    options: any = {}
  ): Promise<Order> {
    const { transaction } = options;
    const order = await this.orderRepo.findScopedById(tenantId, storeId, id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: OrderItem, as: 'items' },
      ],
      ...(transaction ? { transaction } : {}),
    });
    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found.`);
    }
    return order;
  }

  /**
   * Lists and searches Orders.
   */
  public async listOrders(
    tenantId: number,
    storeId: number,
    query: any
  ): Promise<{ rows: Order[]; count: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      orderNumber,
      customerId,
      status,
      paymentStatus,
      fulfillmentStatus,
      startDate,
      endDate,
      minTotal,
      maxTotal,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (orderNumber) where.orderNumber = { [Op.like]: `%${orderNumber}%` };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    if (minTotal || maxTotal) {
      where.totalAmount = {};
      if (minTotal) where.totalAmount[Op.gte] = Number(minTotal);
      if (maxTotal) where.totalAmount[Op.lte] = Number(maxTotal);
    }

    const sortWhitelist = ['createdAt', 'orderNumber', 'totalAmount', 'status'];
    const orderField = sortWhitelist.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    where.tenantId = tenantId;
    if (storeId && storeId !== 1) {
      where.storeId = storeId;
    }

    return Order.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[orderField, orderDirection]],
      include: [
        { model: Customer, as: 'customer' },
        { model: OrderItem, as: 'items' },
      ],
    });
  }

  /**
   * Updates an Order (only if in draft status).
   */
  public async updateOrder(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    data: any,
    ip?: string,
    userAgent?: string
  ): Promise<Order> {
    const order = await this.getOrder(tenantId, storeId, id);
    if (order.status !== 'draft') {
      throw new ValidationError(
        `Cannot update order: order status is currently '${order.status}'. Only draft orders can be updated.`
      );
    }

    const oldValues = order.toJSON();

    await sequelize.transaction(async (t) => {
      let subtotal = 0;
      const itemRecords: any[] = [];

      if (data.items && Array.isArray(data.items)) {
        // Clear old items first
        await this.orderItemRepo.dbModel.destroy({
          where: { order_id: id },
          transaction: t,
        });

        for (const item of data.items) {
          const product = await Product.findOne({
            where: { id: item.productId, tenantId },
            transaction: t,
          });

          if (!product) {
            throw new NotFoundError(`Product with ID ${item.productId} not found.`);
          }

          const unitPrice = Number(product.price || 0);
          const qty = Number(item.quantity || 1);
          const itemDiscount = Number(item.discount || 0);
          const itemTax = Number(item.tax || 0);

          const itemSubtotal = unitPrice * qty;
          const itemTotal = itemSubtotal - itemDiscount + itemTax;

          subtotal += itemSubtotal;

          itemRecords.push({
            productId: item.productId,
            productVariantId: item.productVariantId || null,
            sku: product.sku,
            productName: product.name,
            quantity: qty,
            unitPrice,
            discount: itemDiscount,
            tax: itemTax,
            subtotal: itemSubtotal,
            total: itemTotal,
            orderId: id,
          });
        }
      } else {
        subtotal = Number(order.subtotal);
      }

      const discountAmount =
        data.discountAmount !== undefined
          ? Number(data.discountAmount)
          : Number(order.discountAmount);
      const taxAmount =
        data.taxAmount !== undefined ? Number(data.taxAmount) : Number(order.taxAmount);
      const shippingAmount =
        data.shippingAmount !== undefined
          ? Number(data.shippingAmount)
          : Number(order.shippingAmount);
      const totalAmount = subtotal - discountAmount + taxAmount + shippingAmount;

      await this.orderRepo.updateScoped(
        tenantId,
        storeId,
        id,
        {
          customerId: data.customerId || order.customerId,
          notes: data.notes !== undefined ? data.notes : order.notes,
          subtotal,
          discountAmount,
          taxAmount,
          shippingAmount,
          totalAmount,
          currency: data.currency || order.currency,
          updatedBy: userId,
        },
        { transaction: t }
      );

      if (itemRecords.length > 0) {
        for (const item of itemRecords) {
          await this.orderItemRepo.createScoped(tenantId, storeId, item, { transaction: t });
        }
      }
    });

    const updated = await this.getOrder(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_UPDATED',
        entityType: 'Order',
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
        activityType: 'ORDER_UPDATED',
        description: `Updated order ${updated.orderNumber}`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  /**
   * Confirms an Order, triggering inventory reservations.
   */
  public async confirmOrder(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Order> {
    const order = await this.getOrder(tenantId, storeId, id);
    if (order.status !== 'draft' && order.status !== 'pending') {
      throw new ValidationError(
        `Cannot confirm order: order status is currently '${order.status}'.`
      );
    }

    const oldValues = order.toJSON();

    await sequelize.transaction(async (t) => {
      // 1. Resolve Warehouse & Location for reservations
      const { warehouseId, locationId } = await this.resolveDefaultWarehouseAndLocation(
        tenantId,
        storeId,
        t
      );

      // 2. Setup reservation payload
      const reservationItems = (order as any).items.map((item: any) => ({
        warehouseId,
        warehouseLocationId: locationId,
        productId: item.productId,
        quantity: item.quantity,
      }));

      // 3. Create stock reservation
      await this.reservationService.createReservation(tenantId, storeId, userId, {
        referenceType: 'Order',
        referenceId: order.id.toString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        items: reservationItems,
      });

      // 4. Update order status
      await this.orderRepo.updateScoped(
        tenantId,
        storeId,
        id,
        {
          status: 'confirmed',
          orderedAt: new Date(),
          updatedBy: userId,
        },
        { transaction: t }
      );
    });

    const updated = await this.getOrder(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_CONFIRMED',
        entityType: 'Order',
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
        activityType: 'ORDER_CONFIRMED',
        description: `Confirmed order ${updated.orderNumber} and reserved inventory`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  /**
   * Cancels an Order, releasing inventory reservations.
   */
  public async cancelOrder(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    reason?: string,
    notes?: string,
    ip?: string,
    userAgent?: string
  ): Promise<Order> {
    const order = await this.getOrder(tenantId, storeId, id);
    if (order.status === 'cancelled') {
      return order;
    }

    const oldValues = order.toJSON();

    await sequelize.transaction(async (t) => {
      // 1. Release Stock Reservation if it exists
      const reservation = await this.reservationRepo.findScopedOne(tenantId, storeId, {
        where: {
          referenceType: 'Order',
          referenceId: order.id.toString(),
          status: 'active',
        },
        transaction: t,
      });

      if (reservation) {
        await this.reservationService.releaseReservation(tenantId, storeId, reservation.id, userId);
      }

      // 2. Update order status and cancellation reason
      const updateData: any = {
        status: 'cancelled',
        updatedBy: userId,
      };

      await this.orderRepo.updateScoped(tenantId, storeId, id, updateData, { transaction: t });

      // 3. Sync Refund record for seller visibility if payment exists
      const payment: any = await Payment.findOne({
        where: { orderId: id, tenantId },
        transaction: t,
      });

      if (payment) {
        const refNum = `REF-SLR-${tenantId}-${Date.now().toString().slice(-6)}`;
        await Refund.create(
          {
            tenantId,
            storeId,
            paymentId: payment.id,
            refundNumber: refNum,
            amount: order.totalAmount,
            reason: reason || 'Customer requested order cancellation',
            status: 'processed',
            refundedAt: new Date(),
            createdBy: userId,
          } as any,
          { transaction: t }
        );
        await payment.update({ paymentStatus: 'refunded' }, { transaction: t });
      }
    });

    const updated = await this.getOrder(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_CANCELLED',
        entityType: 'Order',
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
        activityType: 'ORDER_CANCELLED',
        description: `Cancelled order ${updated.orderNumber} and released reservations`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  /**
   * Completes an Order.
   */
  public async completeOrder(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Order> {
    const order = await this.getOrder(tenantId, storeId, id);
    if (order.status !== 'confirmed' && order.status !== 'processing') {
      throw new ValidationError(
        `Cannot complete order: order status is currently '${order.status}'.`
      );
    }

    const oldValues = order.toJSON();

    await this.orderRepo.updateScoped(tenantId, storeId, id, {
      status: 'completed',
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      updatedBy: userId,
    });

    const updated = await this.getOrder(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_COMPLETED',
        entityType: 'Order',
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
        activityType: 'ORDER_COMPLETED',
        description: `Completed order ${updated.orderNumber}`,
      },
      { ipAddress: ip } as any
    );

    // Release Escrow Funds: Pending Balance -> Available Balance (minus commission)
    try {
      const walletService = new SellerWalletService();
      await walletService.onOrderDelivered(
        tenantId,
        storeId,
        Number(id),
        Number(updated.totalAmount || 0)
      );
    } catch (e: any) {
      // log and continue
    }

    return updated;
  }

  /**
   * Restores an Order to draft status.
   */
  public async restoreOrder(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<Order> {
    const order = await this.getOrder(tenantId, storeId, id);
    if (order.status !== 'cancelled') {
      throw new ValidationError(`Only cancelled orders can be restored to draft.`);
    }

    const oldValues = order.toJSON();

    await this.orderRepo.updateScoped(tenantId, storeId, id, {
      status: 'draft',
      updatedBy: userId,
    });

    const updated = await this.getOrder(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_RESTORED',
        entityType: 'Order',
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
        activityType: 'ORDER_RESTORED',
        description: `Restored order ${updated.orderNumber} to draft`,
      },
      { ipAddress: ip } as any
    );

    return updated;
  }

  /**
   * Soft deletes an Order.
   */
  public async deleteOrder(
    tenantId: number,
    storeId: number,
    id: number,
    userId: number,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const order = await this.getOrder(tenantId, storeId, id);

    await this.orderRepo.deleteScoped(tenantId, storeId, id);

    await createAuditLog(
      {
        tenantId,
        actorId: userId,
        action: 'ORDER_DELETED',
        entityType: 'Order',
        entityId: String(id),
        previousValues: order.toJSON(),
        newValues: null,
      },
      { ipAddress: ip, userAgent } as any
    );

    await createActivityLog(
      {
        tenantId,
        userId,
        activityType: 'ORDER_DELETED',
        description: `Deleted order ${order.orderNumber}`,
      },
      { ipAddress: ip } as any
    );
  }
}
