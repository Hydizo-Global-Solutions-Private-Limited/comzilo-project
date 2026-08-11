import { sequelize } from '../config/database';
import {
  Warehouse,
  WarehouseLocation,
  InventoryBalance,
  StockMovement,
  StockAdjustment,
  StockTransfer,
  StockTransferItem,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsIssue,
  InventoryBatch,
  InventorySerial,
  Product,
} from '../database/models';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';

export class InventoryManagementService {
  // --- DASHBOARD & ANALYTICS ---
  public async getGlobalDashboardStats() {
    const totalWarehouses = await Warehouse.count();
    const totalProducts = await Product.count();
    const inventoryBalances = await InventoryBalance.findAll();

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of inventoryBalances) {
      const current = Number(item.onHandQuantity || 0);
      const unitCost = Number(item.averageCost || 50.0);
      totalStockValue += current * unitCost;

      if (current === 0) outOfStockCount++;
      else if (current <= Number(item.reorderPoint || 10)) lowStockCount++;
    }

    const pendingPOs = await PurchaseOrder.count();
    const recentMovements = await StockMovement.findAll({
      order: [['id', 'DESC']],
      limit: 10,
    });

    return {
      totalWarehouses,
      totalProducts,
      totalInventoryValue: Number(totalStockValue.toFixed(2)),
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      pendingPurchaseOrders: pendingPOs,
      todaysStockMovement: recentMovements.length,
      recentMovements,
    };
  }

  public async getGlobalPurchaseOrders() {
    return await PurchaseOrder.findAll({
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items' },
      ],
      order: [['id', 'DESC']],
    });
  }

  public async getDashboardStats(tenantId: number) {
    const totalWarehouses = await Warehouse.count({ where: { tenantId } });
    const totalProducts = await Product.count({ where: { tenantId } });
    const inventoryBalances = await InventoryBalance.findAll({ where: { tenantId } });

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of inventoryBalances) {
      const current = Number(item.onHandQuantity || 0);
      const unitCost = Number(item.averageCost || 50.0);
      totalStockValue += current * unitCost;

      if (current === 0) outOfStockCount++;
      else if (current <= Number(item.reorderPoint || 10)) lowStockCount++;
    }

    const pendingPOs = await PurchaseOrder.count({
      where: { tenantId, status: ['pending', 'approved'] },
    });
    const recentMovements = await StockMovement.findAll({
      where: { tenantId },
      order: [['id', 'DESC']],
      limit: 10,
    });

    const incomingCount = await StockMovement.count({
      where: { tenantId, movementType: 'IN' } as any,
    }).catch(() => 0);
    const outgoingCount = await StockMovement.count({
      where: { tenantId, movementType: 'OUT' } as any,
    }).catch(() => 0);

    return {
      totalWarehouses,
      totalProducts,
      totalInventoryValue: Number(totalStockValue.toFixed(2)),
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      pendingPurchaseOrders: pendingPOs,
      todaysStockMovement: recentMovements.length,
      incomingStock: incomingCount,
      outgoingStock: outgoingCount,
      recentMovements,
    };
  }

  // --- WAREHOUSES & LOCATIONS ---
  public async getWarehouses(tenantId: number) {
    return await Warehouse.findAll({ where: { tenantId }, order: [['id', 'ASC']] });
  }

  public async createWarehouse(tenantId: number, data: any) {
    if (data.isDefault) {
      await Warehouse.update({ isDefault: false }, { where: { tenantId } });
    }
    return await Warehouse.create({ tenantId, storeId: data.storeId || 1, ...data });
  }

  public async getLocations(tenantId: number, warehouseId?: number) {
    const whereClause: any = { tenantId };
    if (warehouseId) whereClause.warehouseId = warehouseId;
    return await WarehouseLocation.findAll({ where: whereClause });
  }

  public async createLocation(tenantId: number, data: any) {
    return await WarehouseLocation.create({
      tenantId,
      storeId: data.storeId || 1,
      name: data.name || data.locationCode || 'Warehouse Location 1',
      code: data.code || data.locationCode || 'LOC-01',
      ...data,
    });
  }

  // --- INVENTORY BALANCES & STOCK ---
  public async getInventoryBalances(tenantId: number) {
    return await InventoryBalance.findAll({
      where: { tenantId },
      include: [{ model: Product, as: 'product' }],
      order: [['id', 'DESC']],
    });
  }

  // --- STOCK MOVEMENTS & TRANSACTIONS ---
  public async recordMovement(
    tenantId: number,
    params: {
      productId: number;
      warehouseId: number;
      movementType:
        | 'purchase'
        | 'sale'
        | 'transfer'
        | 'adjustment'
        | 'return'
        | 'damage'
        | 'lost'
        | 'production'
        | 'manual';
      quantity: number;
      reason: string;
      referenceNumber?: string;
      unitCost?: number;
    },
    transaction?: any
  ) {
    const t = transaction || (await sequelize.transaction());

    try {
      let balance = await InventoryBalance.findOne({
        where: { tenantId, productId: params.productId, warehouseId: params.warehouseId },
        transaction: t,
      });

      if (!balance) {
        balance = await InventoryBalance.create(
          {
            tenantId,
            storeId: 1,
            productId: params.productId,
            warehouseId: params.warehouseId,
            warehouseLocationId: 1,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            reorderPoint: 10,
          },
          { transaction: t }
        );
      }

      const prevQty = Number(balance.quantityOnHand || balance.get('quantityOnHand') || 0);
      const changeQty = params.quantity;
      const newQty = Math.max(0, prevQty + changeQty);

      balance.quantityOnHand = newQty;
      balance.quantityAvailable = Math.max(0, newQty - Number(balance.quantityReserved || 0));
      await balance.save({ transaction: t });

      const movement = await StockMovement.create(
        {
          tenantId,
          storeId: 1,
          productId: params.productId,
          warehouseId: params.warehouseId,
          warehouseLocationId: 1,
          movementType: params.movementType as any,
          direction: changeQty >= 0 ? 'in' : 'out',
          quantity: Math.abs(changeQty),
          quantityBefore: prevQty,
          quantityAfter: newQty,
          previousQuantity: prevQty,
          newQuantity: newQty,
          reason: params.reason,
          referenceNumber: params.referenceNumber || 'MOV-' + Date.now(),
          unitCost: params.unitCost || Number(balance.averageCost || 50.0),
        },
        { transaction: t }
      );

      if (!transaction) await t.commit();
      return { balance, movement };
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  }

  // --- STOCK TRANSFERS ---
  public async getTransfers(tenantId: number) {
    return await StockTransfer.findAll({
      where: { tenantId },
      include: [{ model: StockTransferItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
  }

  public async createTransfer(tenantId: number, data: any) {
    const t = await sequelize.transaction();
    try {
      const transferNumber = 'TRF-' + Date.now().toString().slice(-6);
      const transfer = await StockTransfer.create(
        {
          tenantId,
          storeId: 1,
          transferNumber,
          sourceWarehouseId: data.sourceWarehouseId,
          destinationWarehouseId: data.destinationWarehouseId,
          status: 'approved' as any,
          requestedAt: new Date(),
          completedAt: new Date(),
        },
        { transaction: t }
      );

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await StockTransferItem.create(
            {
              tenantId,
              storeId: 1,
              stockTransferId: transfer.id,
              transferId: transfer.id,
              productId: item.productId,
              sourceLocationId: 1,
              destinationLocationId: 1,
              requestedQuantity: item.quantity,
              shippedQuantity: item.quantity,
              receivedQuantity: item.quantity,
            },
            { transaction: t }
          );

          // Reduce Source Warehouse
          await this.recordMovement(
            tenantId,
            {
              productId: item.productId,
              warehouseId: data.sourceWarehouseId,
              movementType: 'transfer',
              quantity: -Math.abs(item.quantity),
              reason: `Transfer out to Warehouse #${data.destinationWarehouseId}`,
              referenceNumber: transferNumber,
            },
            t
          );

          // Increase Destination Warehouse
          await this.recordMovement(
            tenantId,
            {
              productId: item.productId,
              warehouseId: data.destinationWarehouseId,
              movementType: 'transfer',
              quantity: Math.abs(item.quantity),
              reason: `Transfer in from Warehouse #${data.sourceWarehouseId}`,
              referenceNumber: transferNumber,
            },
            t
          );
        }
      }

      await t.commit();
      return transfer;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- STOCK ADJUSTMENTS ---
  public async getAdjustments(tenantId: number) {
    return await StockAdjustment.findAll({ where: { tenantId }, order: [['id', 'DESC']] });
  }

  public async createAdjustment(tenantId: number, data: any) {
    const t = await sequelize.transaction();
    try {
      const adjustmentNumber = 'ADJ-' + Date.now().toString().slice(-6);
      const qtyChange =
        data.type === 'decrease' ? -Math.abs(data.quantity) : Math.abs(data.quantity);

      const adjustment = await StockAdjustment.create(
        {
          tenantId,
          storeId: 1,
          adjustmentNumber,
          warehouseId: data.warehouseId,
          warehouseLocationId: 1,
          productId: data.productId,
          adjustmentType: data.type || 'increase',
          reasonCode: data.reasonCode || 'AUDIT',
          quantity: qtyChange,
          reason: data.reason || 'Manual Inventory Count Correction',
          status: 'approved',
        } as any,
        { transaction: t }
      );

      await this.recordMovement(
        tenantId,
        {
          productId: data.productId,
          warehouseId: data.warehouseId,
          movementType: 'adjustment',
          quantity: qtyChange,
          reason: data.reason || 'Stock Adjustment',
          referenceNumber: adjustmentNumber,
        },
        t
      );

      await t.commit();
      return adjustment;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  public async getAdjustmentById(tenantId: number, id: number) {
    const adj = await StockAdjustment.findOne({ where: { id, tenantId } });
    if (!adj) throw new Error('Stock adjustment not found');
    return adj;
  }

  public async updateAdjustment(tenantId: number, id: number, data: any) {
    const adj = await StockAdjustment.findOne({ where: { id, tenantId } });
    if (!adj) throw new Error('Stock adjustment not found');
    await adj.update(data);
    return adj;
  }

  public async deleteAdjustment(tenantId: number, id: number) {
    const adj = await StockAdjustment.findOne({ where: { id, tenantId } });
    if (!adj) throw new Error('Stock adjustment not found');
    await adj.destroy();
    return true;
  }

  // --- SUPPLIERS & PURCHASE ORDERS ---
  public async getSuppliers(tenantId: number) {
    return await Supplier.findAll({ where: { tenantId }, order: [['id', 'ASC']] });
  }

  public async createSupplier(tenantId: number, data: any) {
    return await Supplier.create({
      tenantId,
      storeId: 1,
      code: data.code || 'SUP-' + Date.now().toString().slice(-6),
      ...data,
    });
  }

  public async updateSupplier(tenantId: number, id: number, data: any) {
    const supplier = await Supplier.findOne({ where: { id, tenantId } });
    if (!supplier) throw new Error('Supplier not found');
    return await supplier.update(data);
  }

  public async deleteSupplier(tenantId: number, id: number) {
    const supplier = await Supplier.findOne({ where: { id, tenantId } });
    if (!supplier) throw new Error('Supplier not found');
    await supplier.destroy();
    return true;
  }

  public async getPurchaseOrders(tenantId: number) {
    return await PurchaseOrder.findAll({
      where: { tenantId },
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items' },
      ],
      order: [['id', 'DESC']],
    });
  }

  public async createPurchaseOrder(tenantId: number, data: any) {
    const poNumber = 'PO-' + Date.now().toString().slice(-6);
    const po = await PurchaseOrder.create({
      tenantId,
      storeId: 1,
      poNumber,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId || 1,
      status: data.status || 'pending',
      subtotal: data.subtotal || data.totalAmount || 0,
      totalAmount: data.totalAmount || 0,
      expectedDeliveryDate: data.expectedDeliveryDate || new Date(Date.now() + 864000000),
    });

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        await PurchaseOrderItem.create({
          poId: po.id,
          productId: item.productId || 1,
          quantityOrdered: item.quantity || item.orderedQuantity || item.quantityOrdered || 1,
          unitCost: item.unitPrice || item.unitCost || 50.0,
          subtotal:
            (item.quantity || item.orderedQuantity || item.quantityOrdered || 1) *
            (item.unitPrice || item.unitCost || 50.0),
        });
      }
    }

    return await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items' },
      ],
    });
  }

  public async updateGlobalPurchaseOrderStatus(id: number, status: string) {
    const po = await PurchaseOrder.findByPk(id);
    if (!po) throw new NotFoundError('Purchase order not found');
    await po.update({ status });
    return po;
  }

  public async updatePurchaseOrder(tenantId: number, id: number, data: any) {
    const po = await PurchaseOrder.findOne({ where: { id, tenantId } });
    if (!po) throw new Error('Purchase order not found');
    await po.update(data);
    return po;
  }

  public async deletePurchaseOrder(tenantId: number, id: number) {
    const po = await PurchaseOrder.findOne({ where: { id, tenantId } });
    if (!po) throw new Error('Purchase order not found');
    await PurchaseOrderItem.destroy({ where: { poId: id } });
    await po.destroy();
    return true;
  }

  // --- GOODS RECEIPT NOTE (GRN) & GOODS ISSUE NOTE (GIN) ---
  public async getGoodsReceipts(tenantId: number) {
    return await GoodsReceipt.findAll({ where: { tenantId }, order: [['id', 'DESC']] });
  }

  public async createGoodsReceipt(tenantId: number, data: any) {
    const t = await sequelize.transaction();
    try {
      const grnNumber = 'GRN-' + Date.now().toString().slice(-6);
      const grn = await GoodsReceipt.create(
        {
          tenantId,
          storeId: data.storeId || 1,
          poId: data.poId || 1,
          warehouseId: data.warehouseId || 1,
          grnNumber,
          status: 'received',
          receivedAt: new Date(),
        },
        { transaction: t }
      );

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await GoodsReceiptItem.create(
            {
              grnId: grn.id,
              goodsReceiptId: grn.id,
              poItemId: item.poItemId || 1,
              productId: item.productId,
              warehouseLocationId: 1,
              receivedQuantity: item.quantity,
              unitPrice: item.unitPrice || 50.0,
              unitCost: item.unitPrice || 50.0,
              subtotal: item.quantity * (item.unitPrice || 50.0),
            },
            { transaction: t }
          );

          await this.recordMovement(
            tenantId,
            {
              productId: item.productId,
              warehouseId: data.warehouseId || 1,
              movementType: 'purchase',
              quantity: Math.abs(item.quantity),
              reason: `Goods Receipt Note (GRN #${grnNumber})`,
              referenceNumber: grnNumber,
              unitCost: item.unitPrice || 50.0,
            },
            t
          );
        }
      }

      await t.commit();
      return grn;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  public async getGoodsIssues(tenantId: number) {
    return await GoodsIssue.findAll({ where: { tenantId }, order: [['id', 'DESC']] });
  }

  public async createGoodsIssue(tenantId: number, data: any) {
    const t = await sequelize.transaction();
    try {
      const ginNumber = 'GIN-' + Date.now().toString().slice(-6);
      const gin = await GoodsIssue.create(
        {
          tenantId,
          storeId: data.storeId || 1,
          ginNumber,
          warehouseId: data.warehouseId || 1,
          referenceOrder: data.referenceOrder || 'ORD-GENERIC',
          reason: data.reason || 'Goods Issued for Sales Order',
          status: 'issued',
          issuedAt: new Date(),
        },
        { transaction: t }
      );

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await this.recordMovement(
            tenantId,
            {
              productId: item.productId,
              warehouseId: data.warehouseId || 1,
              movementType: 'sale',
              quantity: -Math.abs(item.quantity),
              reason: `Goods Issue Note (GIN #${ginNumber})`,
              referenceNumber: ginNumber,
            },
            t
          );
        }
      }

      await t.commit();
      return gin;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // --- BATCH & SERIAL NUMBERS ---
  public async getBatches(tenantId: number) {
    return await InventoryBatch.findAll({ where: { tenantId }, order: [['id', 'DESC']] });
  }

  public async getSerials(tenantId: number) {
    return await InventorySerial.findAll({ where: { tenantId }, order: [['id', 'DESC']] });
  }
}
