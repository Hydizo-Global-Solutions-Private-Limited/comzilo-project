/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  POSRegister,
  PosRegisterSession,
  PosCashMovement,
  PosSale,
  PosSaleItem,
  PosSalePayment,
  PosReturn,
  PosOfflineQueue,
} from '../database/models';
import { StoreInventoryService } from './storeInventory.service';
import { createAuditLog } from '../utils/auditHelper';

export class StorePosService {
  // ================= REGISTERS & SESSIONS =================
  static async getRegisters(tenantId: number, storeId: number) {
    const registers = await POSRegister.findAll({
      where: { tenantId, storeId },
      include: [{ model: PosRegisterSession, as: 'sessions' }],
      order: [['id', 'DESC']],
    });
    return registers;
  }

  static async createRegister(tenantId: number, storeId: number, userId: number, payload: any) {
    const name = payload.name || 'Main POS Register';
    const code = payload.code || name.toLowerCase().replace(/\s+/g, '_');

    const existing = await POSRegister.findOne({ where: { tenantId, storeId, code } });
    if (existing) {
      return existing;
    }

    const register = await POSRegister.create({
      tenantId,
      storeId,
      name,
      code,
      status: 'closed',
      openingAmount: 0,
    } as any);

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'pos_register.created',
      entityType: 'POSRegister',
      entityId: String(register.id),
    });

    return register;
  }

  static async openSession(tenantId: number, storeId: number, userId: number, payload: any) {
    const register = await POSRegister.findOne({
      where: { id: payload.registerId, tenantId, storeId },
    });
    if (!register) throw new Error('Register not found');

    const session = await PosRegisterSession.create({
      tenantId,
      storeId,
      registerId: register.id,
      cashierUserId: userId,
      openingCash: payload.openingCash || 200.0,
      status: 'open',
      openedAt: new Date(),
    });

    await register.update({ status: 'open' });

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'pos_session.opened',
      entityType: 'PosRegisterSession',
      entityId: String(session.id),
    });

    return session;
  }

  static async closeSession(tenantId: number, storeId: number, userId: number, payload: any) {
    const session = await PosRegisterSession.findOne({
      where: { id: payload.sessionId, tenantId, storeId },
      include: [
        { model: PosCashMovement, as: 'cashMovements' },
        { model: PosSale, as: 'sales', include: [{ model: PosSalePayment, as: 'payments' }] },
      ],
    });
    if (!session) throw new Error('Register session not found');

    let cashSalesTotal = 0;
    const salesList = (session as any).sales || [];
    for (const sale of salesList) {
      if (sale.payments) {
        for (const p of sale.payments) {
          if (p.paymentMethod === 'cash') {
            cashSalesTotal += Number(p.amountPaid) - Number(p.changeGiven);
          }
        }
      }
    }

    let cashMovementsTotal = 0;
    const movementsList = (session as any).cashMovements || [];
    for (const m of movementsList) {
      if (m.movementType === 'float' || m.movementType === 'pay_in') {
        cashMovementsTotal += Number(m.amount);
      } else if (m.movementType === 'drop' || m.movementType === 'payout') {
        cashMovementsTotal -= Number(m.amount);
      }
    }

    const expectedCash = Number(session.openingCash) + cashSalesTotal + cashMovementsTotal;
    const closingCash = Number(payload.closingCash || expectedCash);
    const cashDifference = closingCash - expectedCash;

    await session.update({
      closingCash,
      expectedCash,
      cashDifference,
      status: 'closed',
      closedAt: new Date(),
    });

    await POSRegister.update({ status: 'closed' }, { where: { id: session.registerId } });

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'pos_session.closed',
      entityType: 'PosRegisterSession',
      entityId: String(session.id),
    });

    return session;
  }

  static async addCashMovement(tenantId: number, storeId: number, userId: number, payload: any) {
    const movement = await PosCashMovement.create({
      tenantId,
      storeId,
      sessionId: payload.sessionId,
      movementType: payload.movementType || 'drop',
      amount: payload.amount,
      reason: payload.reason || null,
    });

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: `pos_cash.${payload.movementType || 'drop'}`,
      entityType: 'PosCashMovement',
      entityId: String(movement.id),
    });

    return movement;
  }

  // ================= CHECKOUT & SPLIT PAYMENTS =================
  static async processSale(tenantId: number, storeId: number, userId: number, payload: any) {
    const session = await PosRegisterSession.findOne({
      where: { id: payload.sessionId, tenantId, storeId },
    });
    if (!session || session.status !== 'open') {
      throw new Error('Register session must be open to process POS sale');
    }

    const register = await POSRegister.findByPk(session.registerId);
    const warehouseId = register ? (register as any).warehouseId || 1 : 1;

    const saleNumber = `POS-${Date.now()}`;
    const items = payload.items || [];
    let subtotal = 0;

    for (const item of items) {
      subtotal += Number(item.unitPrice) * Number(item.quantity);
    }

    const taxAmount = payload.taxAmount || 0.0;
    const discountAmount = payload.discountAmount || 0.0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const sale = await PosSale.create({
      tenantId,
      storeId,
      sessionId: session.id,
      orderId: payload.orderId || null,
      customerId: payload.customerId || null,
      saleNumber,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      status: 'completed',
    });

    for (const item of items) {
      const itemSubtotal = Number(item.unitPrice) * Number(item.quantity);
      await PosSaleItem.create({
        saleId: sale.id,
        productId: item.productId,
        variantId: item.variantId || null,
        barcode: item.barcode || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
      });

      // Deduct inventory balance
      await StoreInventoryService.updateStock(tenantId, storeId, userId, {
        warehouseId,
        productId: item.productId,
        quantity: -item.quantity,
        mode: 'add',
      });
    }

    const payments = payload.payments || [
      { paymentMethod: 'cash', amountPaid: totalAmount, changeGiven: 0 },
    ];
    for (const p of payments) {
      await PosSalePayment.create({
        saleId: sale.id,
        paymentMethod: p.paymentMethod,
        amountPaid: p.amountPaid,
        changeGiven: p.changeGiven || 0.0,
      });
    }

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'pos_sale.completed',
      entityType: 'PosSale',
      entityId: String(sale.id),
    });

    return sale;
  }

  // ================= RETURNS & REFUNDS =================
  static async processReturn(tenantId: number, storeId: number, userId: number, payload: any) {
    const sale = await PosSale.findOne({
      where: { id: payload.saleId, tenantId, storeId },
    });
    if (!sale) throw new Error('Original POS sale not found');

    const returnNumber = `RET-${Date.now()}`;
    const posReturn = await PosReturn.create({
      tenantId,
      storeId,
      saleId: sale.id,
      returnNumber,
      refundAmount: payload.refundAmount || sale.totalAmount,
      refundMethod: payload.refundMethod || 'cash',
      reason: payload.reason || 'Customer Return',
    });

    await sale.update({ status: 'returned' });

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'pos_return.processed',
      entityType: 'PosReturn',
      entityId: String(posReturn.id),
    });

    return posReturn;
  }

  // ================= OFFLINE SYNC QUEUE =================
  static async syncOfflineQueue(
    tenantId: number,
    storeId: number,
    userId: number,
    payloads: any[]
  ) {
    const results = [];
    for (const item of payloads) {
      const guid = item.offlineGuid || `GUID-${Math.random().toString(36).substring(2, 9)}`;
      const queueItem = await PosOfflineQueue.create({
        tenantId,
        storeId,
        offlineGuid: guid,
        payloadJson: item,
        status: 'synced',
      });
      results.push(queueItem);
    }

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'pos_offline_queue.synced',
      entityType: 'PosOfflineQueue',
      entityId: String(results.length),
    });

    return results;
  }
}
