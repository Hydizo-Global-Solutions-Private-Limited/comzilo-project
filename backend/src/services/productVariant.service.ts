import {
  ProductVariant,
  VariantAttribute,
  VariantImage,
  VariantInventory,
  Product,
} from '../database/models';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { logVariantCreated, logVariantUpdated, logVariantDeleted } from '../utils/auditHelper';

export class ProductVariantService {
  public async getProductVariants(productId: number, tenantId?: number | null) {
    const whereClause: any = { productId };
    if (tenantId) whereClause.tenantId = tenantId;

    return await ProductVariant.findAll({
      where: whereClause,
      include: [
        { model: VariantAttribute, as: 'attributes' },
        { model: VariantImage, as: 'images' },
        { model: VariantInventory, as: 'inventories' },
      ],
      order: [['id', 'ASC']],
    });
  }

  public async getVariantById(variantId: number, tenantId?: number | null, options: any = {}) {
    const whereClause: any = { id: variantId };
    if (tenantId) whereClause.tenantId = tenantId;

    const queryOpts: any = {
      where: whereClause,
      include: [
        { model: VariantAttribute, as: 'attributes' },
        { model: VariantImage, as: 'images' },
        { model: VariantInventory, as: 'inventories' },
      ],
    };

    if (options && options.transaction) {
      queryOpts.transaction = options.transaction;
    }

    const variant = await ProductVariant.findOne(queryOpts);

    if (!variant) throw new NotFoundError('Product variant not found');
    return variant;
  }

  public async createVariant(tenantId: number | null, data: any, options: any = {}) {
    if (!data.productId || !data.sku || data.price === undefined) {
      throw new ValidationError('Product ID, SKU, and Price are required for a variant');
    }

    if (!tenantId && data.productId) {
      const parentProd = await Product.findByPk(data.productId, options);
      if (parentProd && parentProd.tenantId) {
        tenantId = parentProd.tenantId;
      }
    }
    const resolvedTenantId = tenantId || 1;

    const existingSku = await ProductVariant.findOne({ where: { sku: data.sku }, ...options });
    if (existingSku) {
      throw new ValidationError(`Variant SKU "${data.sku}" already exists`);
    }

    const variant: any = await ProductVariant.create(
      {
        tenantId: resolvedTenantId,
        storeId: data.storeId || 1,
        productId: data.productId,
        sku: data.sku,
        barcode: data.barcode || null,
        price: data.price,
        compareAtPrice: data.compareAtPrice || null,
        costPrice: data.costPrice || null,
        stockQuantity: data.stockQuantity || 0,
        status: data.status || 'active',
      },
      options
    );

    if (data.attributes && Array.isArray(data.attributes)) {
      for (const attr of data.attributes) {
        await VariantAttribute.create(
          {
            variantId: variant.id,
            attributeName: attr.name || attr.attributeName,
            attributeValue: attr.value || attr.attributeValue,
          },
          options
        );
      }
    }

    if (data.images && Array.isArray(data.images)) {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        await VariantImage.create(
          {
            variantId: variant.id,
            imageUrl: typeof img === 'string' ? img : img.imageUrl,
            displayOrder: i,
            isPrimary: i === 0,
          },
          options
        );
      }
    }

    if (data.stockQuantity !== undefined) {
      await VariantInventory.create(
        {
          tenantId: resolvedTenantId,
          storeId: data.storeId || 1,
          variantId: variant.id,
          warehouseId: data.warehouseId || 1,
          quantityOnHand: data.stockQuantity || 0,
          quantityAvailable: data.stockQuantity || 0,
          quantityReserved: 0,
        },
        options
      );
    }

    await logVariantCreated(variant);

    return await this.getVariantById(variant.id, tenantId, options);
  }

  public async updateVariant(variantId: number, tenantId: number | null, data: any) {
    const variant = await this.getVariantById(variantId, tenantId);
    const oldValues = variant.get({ plain: true });

    await variant.update({
      sku: data.sku !== undefined ? data.sku : variant.sku,
      barcode: data.barcode !== undefined ? data.barcode : variant.barcode,
      price: data.price !== undefined ? data.price : variant.price,
      compareAtPrice:
        data.compareAtPrice !== undefined ? data.compareAtPrice : variant.compareAtPrice,
      costPrice: data.costPrice !== undefined ? data.costPrice : variant.costPrice,
      stockQuantity: data.stockQuantity !== undefined ? data.stockQuantity : variant.stockQuantity,
      status: data.status !== undefined ? data.status : variant.status,
    });

    if (data.attributes && Array.isArray(data.attributes)) {
      await VariantAttribute.destroy({ where: { variantId } });
      for (const attr of data.attributes) {
        await VariantAttribute.create({
          variantId,
          attributeName: attr.name || attr.attributeName,
          attributeValue: attr.value || attr.attributeValue,
        });
      }
    }

    if (data.stockQuantity !== undefined) {
      const inv = await VariantInventory.findOne({ where: { variantId } });
      if (inv) {
        await inv.update({
          quantityOnHand: data.stockQuantity,
          quantityAvailable: data.stockQuantity - Number(inv.reservedStock || 0),
        });
      } else {
        await VariantInventory.create({
          tenantId,
          storeId: 1,
          variantId,
          warehouseId: 1,
          quantityOnHand: data.stockQuantity,
          quantityAvailable: data.stockQuantity,
          quantityReserved: 0,
        });
      }
    }

    await logVariantUpdated(oldValues, variant.get({ plain: true }));

    return await this.getVariantById(variantId, tenantId);
  }

  public async deleteVariant(variantId: number, tenantId: number | null) {
    const variant = await this.getVariantById(variantId, tenantId);
    const oldValues = variant.get({ plain: true });

    await variant.destroy();
    await logVariantDeleted(oldValues);
    return true;
  }
}
