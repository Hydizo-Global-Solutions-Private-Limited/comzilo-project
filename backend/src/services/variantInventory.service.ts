import { VariantInventory, ProductVariant, Warehouse } from '../database/models';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';

export class VariantInventoryService {
  public async getVariantInventories(variantId: number, tenantId?: number | null) {
    const whereClause: any = { variantId };
    if (tenantId) whereClause.tenantId = tenantId;

    const balances = await VariantInventory.findAll({
      where: whereClause,
      include: [{ model: Warehouse, as: 'warehouse' }],
    });

    return balances.map((b) => {
      const plain = b.get({ plain: true });
      const current = plain.quantityOnHand || 0;
      const reserved = plain.reservedStock || 0;
      const available = Math.max(0, current - reserved);
      const lowThreshold = plain.lowStockThreshold || 5;

      let status = 'in_stock';
      if (available === 0) status = 'out_of_stock';
      else if (available <= lowThreshold) status = 'low_stock';

      return {
        ...plain,
        reservedStock: reserved,
        quantityAvailable: available,
        status,
      };
    });
  }

  public async allocateWarehouse(
    tenantId: number | null,
    storeId: number | null,
    data: any,
    context?: any
  ) {
    if (!data.variantId || !data.warehouseId) {
      throw new ValidationError('Variant ID and Warehouse ID are required');
    }

    const existing = await VariantInventory.findOne({
      where: { variantId: data.variantId, warehouseId: data.warehouseId },
    });
    if (existing) {
      throw new ValidationError('This variant is already allocated to the specified warehouse');
    }

    const currentStock = Math.max(0, Number(data.quantityOnHand) || 0);
    const lowThreshold = Number(data.lowStockThreshold) || 5;
    const reorderLvl = Number(data.reorderLevel) || 10;

    const inventory = await VariantInventory.create({
      tenantId,
      storeId,
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      quantityOnHand: currentStock,
      reservedStock: 0,
      quantityAvailable: currentStock,
      lowStockThreshold: lowThreshold,
      reorderLevel: reorderLvl,
      status:
        currentStock > lowThreshold ? 'in_stock' : currentStock > 0 ? 'low_stock' : 'out_of_stock',
      notes: data.notes || null,
    });

    // Update ProductVariant total stock quantity
    await this.recalculateTotalVariantStock(data.variantId);

    await createAuditLog(
      {
        tenantId,
        action: 'VARIANT_STOCK_CREATED',
        entityType: 'VariantInventory',
        entityId: String(inventory.id),
        newValues: inventory.get({ plain: true }),
      },
      context
    );

    return inventory;
  }

  public async adjustStock(tenantId: number | null, data: any, context?: any, options: any = {}) {
    const { variantId, warehouseId, adjustmentQty, movementType, notes } = data;
    if (!variantId || !warehouseId || adjustmentQty === undefined) {
      throw new ValidationError('Variant ID, Warehouse ID, and Adjustment Quantity are required');
    }

    let inventory = await VariantInventory.findOne({
      where: { variantId, warehouseId },
      ...options,
    });
    const { ProductVariant } = require('../database/models');
    const variant = await ProductVariant.findByPk(variantId, options);

    if (!inventory) {
      const initialStock = variant ? Number(variant.stockQuantity || 0) : 0;
      inventory = await this.allocateWarehouse(
        tenantId,
        null,
        { variantId, warehouseId, quantityOnHand: initialStock },
        context
      );
    } else if (
      inventory &&
      (inventory.quantityOnHand || 0) <= 0 &&
      variant &&
      Number(variant.stockQuantity || 0) > 0
    ) {
      inventory.quantityOnHand = Number(variant.stockQuantity);
      inventory.quantityAvailable = Number(variant.stockQuantity) - (inventory.reservedStock || 0);
      await inventory.save(options);
    }

    const currentStock = inventory.quantityOnHand || 0;
    const reserved = inventory.reservedStock || 0;
    const newStock = currentStock + Number(adjustmentQty);

    if (newStock < 0) {
      throw new ValidationError('Adjustment failed: Current stock cannot drop below zero');
    }
    if (newStock - reserved < 0) {
      throw new ValidationError('Adjustment failed: Available stock cannot drop below zero');
    }

    const oldValues = inventory.get({ plain: true });
    const available = newStock - reserved;
    const lowThreshold = inventory.lowStockThreshold || 5;

    let newStatus = 'in_stock';
    if (available === 0) newStatus = 'out_of_stock';
    else if (available <= lowThreshold) newStatus = 'low_stock';

    await inventory.update(
      {
        quantityOnHand: newStock,
        quantityAvailable: available,
        status: newStatus,
        notes: notes || inventory.notes,
      },
      options
    );

    if (variant) {
      await variant.update({ stockQuantity: newStock }, options);
    }

    // Record Stock Movement Log
    try {
      const models = require('../database/models');
      if (models && models.StockMovementLog) {
        await models.StockMovementLog.create(
          {
            tenantId: tenantId || 1,
            variantInventoryId: inventory.id,
            variantId,
            warehouseId,
            movementType: movementType || 'manual_adjustment',
            quantityBefore: currentStock,
            quantityAfter: newStock,
            quantityChanged: Number(adjustmentQty),
            notes: notes || 'Stock adjustment',
            createdBy: context?.authenticatedUserId || null,
          },
          options
        );
      }
    } catch (e) {
      // safe fallback if StockMovementLog table/model does not exist
    }

    // Update ProductVariant total stock quantity
    await this.recalculateTotalVariantStock(variantId, options);

    await createAuditLog(
      {
        tenantId: tenantId || 1,
        action: 'VARIANT_STOCK_ADJUSTED',
        entityType: 'VariantInventory',
        entityId: String(inventory.id),
        previousValues: oldValues,
        newValues: inventory.get({ plain: true }),
      },
      context
    );

    return inventory;
  }

  public async reserveStock(
    tenantId: number | null,
    variantId: number,
    warehouseId: number,
    qty: number
  ) {
    const inventory = await VariantInventory.findOne({ where: { variantId, warehouseId } });
    if (!inventory) throw new NotFoundError('Variant inventory record not found');

    const available = (inventory.quantityOnHand || 0) - (inventory.reservedStock || 0);
    if (qty > available) {
      throw new ValidationError(`Cannot reserve ${qty} units. Only ${available} available.`);
    }

    const newReserved = (inventory.reservedStock || 0) + qty;
    const newAvailable = (inventory.quantityOnHand || 0) - newReserved;

    await inventory.update({
      reservedStock: newReserved,
      quantityAvailable: newAvailable,
    });

    return inventory;
  }

  public async releaseReservedStock(
    tenantId: number | null,
    variantId: number,
    warehouseId: number,
    qty: number
  ) {
    const inventory = await VariantInventory.findOne({ where: { variantId, warehouseId } });
    if (!inventory) throw new NotFoundError('Variant inventory record not found');

    const currentReserved = inventory.reservedStock || 0;
    if (qty > currentReserved) {
      throw new ValidationError(
        `Cannot release ${qty} reserved units. Current reserved is ${currentReserved}.`
      );
    }

    const newReserved = currentReserved - qty;
    const newAvailable = (inventory.quantityOnHand || 0) - newReserved;

    await inventory.update({
      reservedStock: newReserved,
      quantityAvailable: newAvailable,
    });

    return inventory;
  }

  public async transferStock(tenantId: number | null, data: any, context?: any) {
    const { variantId, fromWarehouseId, toWarehouseId, quantity } = data;
    if (!variantId || !fromWarehouseId || !toWarehouseId || !quantity || quantity <= 0) {
      throw new ValidationError(
        'Valid Variant ID, From Warehouse, To Warehouse, and Positive Quantity are required'
      );
    }

    // Deduct from source
    await this.adjustStock(
      tenantId,
      {
        variantId,
        warehouseId: fromWarehouseId,
        adjustmentQty: -quantity,
        movementType: 'transfer_out',
        notes: `Transferred to Warehouse #${toWarehouseId}`,
      },
      context
    );

    // Add to destination
    await this.adjustStock(
      tenantId,
      {
        variantId,
        warehouseId: toWarehouseId,
        adjustmentQty: quantity,
        movementType: 'transfer_in',
        notes: `Transferred from Warehouse #${fromWarehouseId}`,
      },
      context
    );

    await createAuditLog(
      {
        tenantId,
        action: 'VARIANT_STOCK_TRANSFERRED',
        entityType: 'VariantInventory',
        entityId: String(variantId),
        newValues: { fromWarehouseId, toWarehouseId, quantity },
      },
      context
    );

    return true;
  }

  public async bulkUpdateInventory(tenantId: number | null, updates: any[], context?: any) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationError('Updates array cannot be empty');
    }

    for (const item of updates) {
      if (item.variantId && item.warehouseId) {
        if (item.lowStockThreshold !== undefined) {
          const inv = await VariantInventory.findOne({
            where: { variantId: item.variantId, warehouseId: item.warehouseId },
          });
          if (inv) {
            await inv.update({ lowStockThreshold: item.lowStockThreshold });
          }
        }
        if (item.adjustmentQty !== undefined) {
          await this.adjustStock(tenantId, item, context);
        }
      }
    }

    return true;
  }

  private async recalculateTotalVariantStock(variantId: number, options: any = {}) {
    const balances = await VariantInventory.findAll({ where: { variantId }, ...options });
    const totalStock = balances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

    const variant = await ProductVariant.findByPk(variantId, options);
    if (variant) {
      await variant.update({ stockQuantity: totalStock }, options);
    }
  }
}
