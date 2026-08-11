/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import {
  ProductVariant,
  VariantInventory,
  OrderItem,
  Product,
  CategoryAttribute,
  AttributeValue,
} from '../database/models';
import { Op } from 'sequelize';

export class VariantAnalyticsService {
  /**
   * Summary Dashboard Metrics & Widgets
   */
  public async getDashboardSummary(tenantId: number, storeId: number, warehouseId?: number) {
    const whereTenant = { tenantId, storeId };

    // 1. Total Variants Count
    const totalVariants = await ProductVariant.count({ where: whereTenant });

    // 2. Inventory Balances & Stock Value
    const invWhere: any = { tenantId };
    if (warehouseId) invWhere.warehouseId = warehouseId;

    const inventories = await VariantInventory.findAll({ where: invWhere });

    let totalStockOnHand = 0;
    let totalReservedStock = 0;
    let totalAvailableStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventories.forEach((inv) => {
      totalStockOnHand += inv.quantityOnHand || 0;
      totalReservedStock += inv.reservedStock || 0;
      const avail = (inv.quantityOnHand || 0) - (inv.reservedStock || 0);
      totalAvailableStock += Math.max(0, avail);

      if (avail <= 0) outOfStockCount++;
      else if (avail <= (inv.lowStockThreshold || 5)) lowStockCount++;
    });

    // 3. Variant Sales & Revenue
    const itemWhere: any = { tenantId, storeId };
    if (warehouseId) itemWhere.warehouseId = warehouseId;

    const salesStats = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQtySold'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
      ],
      where: {
        ...itemWhere,
        variantId: { [Op.ne]: null },
      },
      raw: true,
    });

    const totalQtySold = Number((salesStats[0] as any)?.totalQtySold || 0);
    const totalRevenue = Number((salesStats[0] as any)?.totalRevenue || 0);

    return {
      totalVariants,
      totalStockOnHand,
      totalReservedStock,
      totalAvailableStock,
      totalInventoryValue: totalAvailableStock * 500, // Estimated stock valuation
      lowStockCount,
      outOfStockCount,
      totalQtySold,
      totalRevenue,
    };
  }

  /**
   * Top Selling & Fast/Slow Moving Variants
   */
  public async getTopSellingVariants(tenantId: number, storeId: number, limit: number = 10) {
    const items = await OrderItem.findAll({
      attributes: [
        'variantId',
        'variantSku',
        'productName',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantitySold'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
      ],
      where: {
        tenantId,
        storeId,
        variantId: { [Op.ne]: null },
      },
      group: ['variantId', 'variantSku', 'productName'],
      order: [[sequelize.literal('quantitySold'), 'DESC']],
      limit,
      raw: true,
    });

    return items;
  }

  /**
   * Variant Inventory & Stock Valuation Report
   */
  public async getVariantInventoryReport(tenantId: number, storeId: number, warehouseId?: number) {
    const invWhere: any = { tenantId };
    if (warehouseId) invWhere.warehouseId = warehouseId;

    const records = await VariantInventory.findAll({
      where: invWhere,
      include: [
        {
          model: ProductVariant,
          as: 'variant',
          attributes: ['id', 'sku', 'price', 'compareAtPrice', 'stockQuantity'],
        },
      ],
      order: [['id', 'DESC']],
    });

    return records.map((r: any) => {
      const avail = (r.quantityOnHand || 0) - (r.reservedStock || 0);
      const unitPrice = r.variant ? Number(r.variant.price || 0) : 0;
      return {
        id: r.id,
        variantId: r.variantId,
        sku: r.variant?.sku || 'N/A',
        warehouseId: r.warehouseId,
        quantityOnHand: r.quantityOnHand,
        reservedStock: r.reservedStock,
        quantityAvailable: Math.max(0, avail),
        unitPrice,
        stockValue: Math.max(0, avail) * unitPrice,
        status:
          r.status ||
          (avail <= 0 ? 'out_of_stock' : avail <= r.lowStockThreshold ? 'low_stock' : 'in_stock'),
      };
    });
  }

  /**
   * Category & Attribute Performance Analytics
   */
  public async getAttributePerformanceReport(tenantId: number, storeId: number) {
    const items = await OrderItem.findAll({
      where: {
        tenantId,
        storeId,
        variantId: { [Op.ne]: null },
      },
      raw: true,
    });

    const attrMap: Record<string, { totalQty: number; totalRevenue: number }> = {};

    items.forEach((item: any) => {
      if (item.variantAttributes) {
        let attrs = item.variantAttributes;
        if (typeof attrs === 'string') {
          try {
            attrs = JSON.parse(attrs);
          } catch (e) {
            attrs = {};
          }
        }
        Object.entries(attrs).forEach(([key, val]) => {
          const comboKey = `${key}: ${val}`;
          if (!attrMap[comboKey]) {
            attrMap[comboKey] = { totalQty: 0, totalRevenue: 0 };
          }
          attrMap[comboKey].totalQty += Number(item.quantity || 1);
          attrMap[comboKey].totalRevenue += Number(item.total || 0);
        });
      }
    });

    return Object.entries(attrMap).map(([attributeOption, data]) => ({
      attributeOption,
      totalQtySold: data.totalQty,
      totalRevenue: data.totalRevenue,
    }));
  }

  /**
   * CSV Export Generator
   */
  public async generateReportCSV(
    tenantId: number,
    storeId: number,
    reportType: string
  ): Promise<string> {
    if (reportType === 'inventory') {
      const invData = await this.getVariantInventoryReport(tenantId, storeId);
      let csv =
        'ID,Variant ID,SKU,Warehouse ID,On Hand,Reserved,Available,Unit Price,Stock Value,Status\n';
      invData.forEach((row) => {
        csv += `${row.id},${row.variantId},${row.sku},${row.warehouseId},${row.quantityOnHand},${row.reservedStock},${row.quantityAvailable},${row.unitPrice},${row.stockValue},${row.status}\n`;
      });
      return csv;
    }

    const topSales = await this.getTopSellingVariants(tenantId, storeId, 50);
    let csv = 'Variant ID,SKU,Product Name,Quantity Sold,Total Revenue\n';
    topSales.forEach((row: any) => {
      csv += `${row.variantId},${row.variantSku || ''},"${row.productName}",${row.quantitySold},${row.totalRevenue}\n`;
    });
    return csv;
  }
}
