/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import { Product, ProductVariant, VariantInventory } from '../database/models';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from './auditHelper';

export class VariantMigrationUtility {
  /**
   * Seamlessly converts an existing Simple Product into a Variant Product
   * by auto-creating an initial default variant and migrating warehouse stock balances.
   */
  public async convertSimpleToVariant(
    tenantId: number,
    storeId: number,
    productId: number,
    initialVariantData: {
      sku: string;
      price?: number;
      barcode?: string;
      warehouseId?: number;
      attributes?: { name: string; value: string }[];
    },
    req?: any
  ) {
    return await sequelize.transaction(async (t) => {
      // 1. Fetch Simple Product
      const product = await Product.findOne({
        where: { id: productId, tenantId, storeId },
        transaction: t,
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found.`);
      }

      if (product.productType === 'variable') {
        throw new ValidationError(`Product ID ${productId} is already a variable product.`);
      }

      // 2. Create Default Initial Variant
      const variantSku = initialVariantData.sku || `${product.sku}-VAR-1`;
      const variantPrice =
        initialVariantData.price !== undefined
          ? initialVariantData.price
          : Number(product.price || 0);

      const variant = await ProductVariant.create(
        {
          tenantId,
          storeId,
          productId: product.id,
          sku: variantSku,
          barcode: initialVariantData.barcode || null,
          price: variantPrice,
          stockQuantity: Number(product.stockQuantity || 50),
          status: 'active',
        },
        { transaction: t }
      );

      // 3. Allocate Initial Warehouse Stock
      const targetWarehouseId = initialVariantData.warehouseId || 1;
      await VariantInventory.create(
        {
          tenantId,
          storeId,
          variantId: variant.id,
          warehouseId: targetWarehouseId,
          quantityOnHand: Number(product.stockQuantity || 50),
          reservedStock: 0,
          quantityAvailable: Number(product.stockQuantity || 50),
          lowStockThreshold: 5,
          status: 'in_stock',
        },
        { transaction: t }
      );

      // 4. Update Product Type to Variable
      await product.update({ productType: 'variable' }, { transaction: t });

      // 5. Audit Log
      await createAuditLog({
        tenantId,
        userId: req?.user?.id || 1,
        action: 'PRODUCT_CONVERTED_TO_VARIABLE',
        entityType: 'Product',
        entityId: String(productId),
        details: { productId, variantId: variant.id, newSku: variantSku },
        req,
      });

      return {
        product,
        initialVariant: variant,
      };
    });
  }
}
