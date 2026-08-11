/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import { ProductVariant, VariantInventory, Product } from '../database/models';
import { ValidationError } from '../shared/errors/AppError';
import { Op } from 'sequelize';

export class BulkVariantService {
  /**
   * Advanced Multi-Filter Paginated Variant Search
   */
  public async searchVariants(tenantId: number, storeId: number, query: any) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    const whereClause: any = { tenantId, storeId };

    if (query.status) whereClause.status = query.status;
    if (query.sku) whereClause.sku = { [Op.like]: `%${query.sku}%` };
    if (query.minPrice || query.maxPrice) {
      whereClause.price = {};
      if (query.minPrice) whereClause.price[Op.gte] = Number(query.minPrice);
      if (query.maxPrice) whereClause.price[Op.lte] = Number(query.maxPrice);
    }

    const productWhere: any = {};
    if (query.search) {
      productWhere.name = { [Op.like]: `%${query.search}%` };
    }

    const { rows, count } = await ProductVariant.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'category'],
          where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
        },
      ],
      limit,
      offset,
      order: [['id', 'DESC']],
    });

    return {
      variants: rows,
      pagination: {
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Bulk Price Update (Flat / Percentage Adjustment)
   */
  public async bulkUpdatePrice(
    tenantId: number,
    storeId: number,
    payload: {
      variantIds: number[];
      adjustmentType: 'percentage' | 'flat';
      direction: 'increase' | 'decrease';
      value: number;
      updateComparePrice?: boolean;
    }
  ) {
    if (!payload.variantIds || payload.variantIds.length === 0) {
      throw new ValidationError('At least one variant must be selected for bulk price update.');
    }

    return await sequelize.transaction(async (t) => {
      const variants = await ProductVariant.findAll({
        where: { id: payload.variantIds, tenantId, storeId },
        transaction: t,
      });

      let updatedCount = 0;

      for (const variant of variants) {
        const currentPrice = Number(variant.price || 0);
        let newPrice = currentPrice;

        if (payload.adjustmentType === 'percentage') {
          const delta = (currentPrice * payload.value) / 100;
          newPrice = payload.direction === 'increase' ? currentPrice + delta : currentPrice - delta;
        } else {
          newPrice =
            payload.direction === 'increase'
              ? currentPrice + payload.value
              : currentPrice - payload.value;
        }

        newPrice = Math.max(0, Math.round(newPrice * 100) / 100);

        const updateFields: any = { price: newPrice };
        if (payload.updateComparePrice) {
          updateFields.compareAtPrice = currentPrice;
        }

        await variant.update(updateFields, { transaction: t });
        updatedCount++;
      }

      return { affectedRecords: updatedCount };
    });
  }

  /**
   * Bulk Multi-Warehouse Inventory Update / Stock Replacement
   */
  public async bulkUpdateInventory(
    tenantId: number,
    storeId: number,
    payload: {
      variantIds: number[];
      warehouseId: number;
      operation: 'add' | 'subtract' | 'replace';
      quantity: number;
    }
  ) {
    if (!payload.variantIds || payload.variantIds.length === 0) {
      throw new ValidationError('At least one variant must be selected for bulk inventory update.');
    }

    return await sequelize.transaction(async (t) => {
      let updatedCount = 0;

      for (const variantId of payload.variantIds) {
        const [inv] = await VariantInventory.findOrCreate({
          where: { variantId, warehouseId: payload.warehouseId, tenantId },
          defaults: {
            tenantId,
            storeId,
            quantityOnHand: 0,
            reservedStock: 0,
            quantityAvailable: 0,
            lowStockThreshold: 5,
          },
          transaction: t,
        });

        let newStock = Number(inv.quantityOnHand || 0);

        if (payload.operation === 'add') newStock += payload.quantity;
        else if (payload.operation === 'subtract')
          newStock = Math.max(0, newStock - payload.quantity);
        else newStock = Math.max(0, payload.quantity);

        const availStock = Math.max(0, newStock - (inv.reservedStock || 0));
        const status =
          availStock <= 0
            ? 'out_of_stock'
            : availStock <= (inv.lowStockThreshold || 5)
              ? 'low_stock'
              : 'in_stock';

        await inv.update(
          {
            quantityOnHand: newStock,
            quantityAvailable: availStock,
            status,
          },
          { transaction: t }
        );

        // Sync master variant total stock
        const totalStock = await VariantInventory.sum('quantity_on_hand', {
          where: { variantId },
          transaction: t,
        });
        await ProductVariant.update(
          { stockQuantity: totalStock || 0 },
          { where: { id: variantId }, transaction: t }
        );

        updatedCount++;
      }

      return { affectedRecords: updatedCount };
    });
  }

  /**
   * Bulk SKU & Barcode Prefix/Suffix/Generator
   */
  public async bulkUpdateSkuBarcode(
    tenantId: number,
    storeId: number,
    payload: {
      variantIds: number[];
      action: 'prefix' | 'suffix' | 'generate_barcode';
      textValue?: string;
    }
  ) {
    return await sequelize.transaction(async (t) => {
      const variants = await ProductVariant.findAll({
        where: { id: payload.variantIds, tenantId, storeId },
        transaction: t,
      });

      let updatedCount = 0;

      for (const v of variants) {
        if (payload.action === 'prefix' && payload.textValue) {
          const newSku = `${payload.textValue}${v.sku}`;
          await v.update({ sku: newSku }, { transaction: t });
        } else if (payload.action === 'suffix' && payload.textValue) {
          const newSku = `${v.sku}${payload.textValue}`;
          await v.update({ sku: newSku }, { transaction: t });
        } else if (payload.action === 'generate_barcode') {
          const newBarcode = `BAR-${v.id}-${Date.now().toString().slice(-6)}`;
          await v.update({ barcode: newBarcode }, { transaction: t });
        }
        updatedCount++;
      }

      return { affectedRecords: updatedCount };
    });
  }

  /**
   * Excel / CSV Import Validator & Processor
   */
  public async importVariants(tenantId: number, storeId: number, rows: any[]) {
    if (!rows || rows.length === 0) {
      throw new ValidationError('Import payload is empty.');
    }

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.sku) {
        errors.push(`Row #${rowNum}: Missing SKU.`);
        continue;
      }
      if (row.price !== undefined && Number(row.price) < 0) {
        errors.push(`Row #${rowNum} (SKU: ${row.sku}): Price cannot be negative.`);
        continue;
      }

      // Find or skip
      const variant = await ProductVariant.findOne({ where: { sku: row.sku, tenantId, storeId } });
      if (!variant) {
        errors.push(`Row #${rowNum} (SKU: ${row.sku}): Variant SKU not found for current seller.`);
        continue;
      }

      const updateData: any = {};
      if (row.price !== undefined) updateData.price = Number(row.price);
      if (row.barcode !== undefined) updateData.barcode = row.barcode;

      await variant.update(updateData);
      successCount++;
    }

    return {
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  /**
   * Excel / CSV Export Generator
   */
  public async exportVariantsCSV(tenantId: number, storeId: number): Promise<string> {
    const variants = await ProductVariant.findAll({
      where: { tenantId, storeId },
      include: [{ model: Product, as: 'product', attributes: ['name'] }],
      order: [['id', 'DESC']],
    });

    let csv = 'Variant ID,SKU,Barcode,Product Name,Price,Compare Price,Stock Quantity,Status\n';
    variants.forEach((v: any) => {
      csv += `${v.id},"${v.sku || ''}","${v.barcode || ''}","${v.product?.name || ''}",${v.price},${v.compareAtPrice || 0},${v.stockQuantity},${v.status}\n`;
    });

    return csv;
  }
}
