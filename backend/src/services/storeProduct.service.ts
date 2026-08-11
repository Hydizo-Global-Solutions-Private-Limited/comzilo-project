/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import {
  Product,
  ProductType,
  ProductPrice,
  ProductVariant,
  ProductOptionSet,
  ProductOptionValue,
  ProductDownload,
  ProductSeo,
  ProductShipping,
  ProductVirtual,
  ProductPodTemplate,
  ProductVersion,
} from '../database/models';
import { Op } from 'sequelize';
import { logger } from '../shared/logging/logger';
import { createAuditLog } from '../utils/auditHelper';

export class StoreProductService {
  /**
   * Fetch paginated list of products isolated by tenant_id & store_id
   */
  static async getProducts(tenantId: number, storeId: number, query: any) {
    const page = parseInt(query.page || '0', 10);
    const limit = parseInt(query.limit || '10', 10);
    const offset = page * limit;

    const where: any = {
      tenantId,
      storeId,
    };

    if (query.search) {
      const trimmedSearch = String(query.search).trim();
      const searchPattern = `%${trimmedSearch}%`;

      const orConditions: any[] = [
        { name: { [Op.like]: searchPattern } },
        { category: { [Op.like]: searchPattern } },
        { brand: { [Op.like]: searchPattern } },
        { sku: { [Op.like]: searchPattern } },
        { barcode: { [Op.like]: searchPattern } },
        { description: { [Op.like]: searchPattern } },
      ];

      const singularTerm = trimmedSearch.toLowerCase().endsWith('s')
        ? trimmedSearch.slice(0, -1)
        : trimmedSearch;
      if (singularTerm && singularTerm.length > 2 && singularTerm !== trimmedSearch) {
        const singularPattern = `%${singularTerm}%`;
        orConditions.push(
          { name: { [Op.like]: singularPattern } },
          { category: { [Op.like]: singularPattern } }
        );
      }

      where[Op.or] = orConditions;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.visibility) {
      where.visibility = query.visibility;
    }

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [
        { model: ProductType, as: 'productType' },
        { model: ProductPrice, as: 'prices' },
        { model: ProductSeo, as: 'seoRecord' },
        { model: ProductShipping, as: 'shippingRecord' },
        { model: ProductVirtual, as: 'virtualRecord' },
        { model: ProductPodTemplate, as: 'podTemplateRecord' },
        { model: ProductDownload, as: 'downloads' },
        { model: ProductVariant, as: 'variants' },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return {
      products: rows,
      total: count,
      page,
      limit,
    };
  }

  /**
   * Fetch single product detail
   */
  static async getProductById(tenantId: number, storeId: number, id: number) {
    const product = await Product.findOne({
      where: { id, tenantId, storeId },
      include: [
        { model: ProductType, as: 'productType' },
        { model: ProductPrice, as: 'prices' },
        { model: ProductSeo, as: 'seoRecord' },
        { model: ProductShipping, as: 'shippingRecord' },
        { model: ProductVirtual, as: 'virtualRecord' },
        { model: ProductPodTemplate, as: 'podTemplateRecord' },
        { model: ProductDownload, as: 'downloads' },
        {
          model: ProductOptionSet,
          as: 'optionSets',
          include: [{ model: ProductOptionValue, as: 'values' }],
        },
        { model: ProductVariant, as: 'variants' },
        { model: ProductVersion, as: 'versions' },
      ],
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Create a new product with normalized child tables in a single transaction
   */
  static async createProduct(tenantId: number, storeId: number, userId: number, payload: any) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Validate unique SKU per store
      if (payload.sku) {
        const existingSku = await Product.findOne({
          where: { tenantId, storeId, sku: payload.sku },
          transaction,
        });
        if (existingSku) {
          throw new Error(`SKU "${payload.sku}" already exists in this store`);
        }
      }

      // 2. Auto-generate unique slug per store
      let slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existingSlug = await Product.findOne({
        where: { tenantId, storeId, slug },
        transaction,
      });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      // 3. Resolve ProductType ID if code provided
      let productTypeId = payload.productTypeId;
      if (!productTypeId && payload.productTypeCode) {
        const typeRecord = await ProductType.findOne({
          where: { code: payload.productTypeCode },
          transaction,
        });
        if (typeRecord) {
          productTypeId = typeRecord.id;
        }
      }

      // 3. Create Core Product Record
      const product = await Product.create(
        {
          tenantId,
          storeId,
          productTypeId,
          name: payload.name,
          slug,
          sku: payload.sku || `SKU-${Date.now()}`,
          shortDescription: payload.shortDescription || null,
          description: payload.description || null,
          status: payload.status || 'draft',
          visibility: payload.visibility || 'public',
          brandId: payload.brandId || null,
          price: payload.price || 0.0,
          comparePrice: payload.comparePrice || null,
          cost: payload.cost || null,
          weight: payload.weight || null,
          dimensions: payload.dimensions || null,
          barcode: payload.barcode || null,
          taxClass: payload.taxClass || null,
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction }
      );

      // 4. Create Product Price Record
      await ProductPrice.create(
        {
          productId: product.id,
          regularPrice: payload.price || 0.0,
          salePrice: payload.salePrice || payload.comparePrice || null,
          costPrice: payload.cost || null,
          currency: payload.currency || 'USD',
        },
        { transaction }
      );

      // 5. Create SEO Record if provided
      if (payload.seo) {
        await ProductSeo.create(
          {
            productId: product.id,
            metaTitle: payload.seo.metaTitle || null,
            metaDescription: payload.seo.metaDescription || null,
            metaKeywords: payload.seo.metaKeywords || null,
            ogImage: payload.seo.ogImage || null,
            canonicalUrl: payload.seo.canonicalUrl || null,
          },
          { transaction }
        );
      }

      // 6. Create Shipping Record if physical/variable
      if (payload.shipping) {
        await ProductShipping.create(
          {
            productId: product.id,
            weight: payload.shipping.weight || null,
            length: payload.shipping.length || null,
            width: payload.shipping.width || null,
            height: payload.shipping.height || null,
            shippingClass: payload.shipping.shippingClass || null,
            packageType: payload.shipping.packageType || null,
          },
          { transaction }
        );
      }

      // 7. Create Virtual Record if virtual product type
      if (payload.virtual) {
        await ProductVirtual.create(
          {
            productId: product.id,
            licenseKey: payload.virtual.licenseKey || null,
            subscriptionDetails: payload.virtual.subscriptionDetails || null,
            meetingLink: payload.virtual.meetingLink || null,
            serviceDuration: payload.virtual.serviceDuration || null,
            activationInstructions: payload.virtual.activationInstructions || null,
          },
          { transaction }
        );
      }

      // 8. Create POD Template if print on demand
      if (payload.pod) {
        await ProductPodTemplate.create(
          {
            productId: product.id,
            canvasSize: payload.pod.canvasSize || null,
            layersJson: payload.pod.layersJson || null,
            mockupPreviewUrl: payload.pod.mockupPreviewUrl || null,
            printArea: payload.pod.printArea || null,
          },
          { transaction }
        );
      }

      // 9. Create Downloads if downloadable product type
      if (payload.downloads && Array.isArray(payload.downloads)) {
        for (const dl of payload.downloads) {
          await ProductDownload.create(
            {
              productId: product.id,
              url: dl.url,
              filename: dl.filename || 'downloadable-file',
              fileSize: dl.fileSize || null,
              version: dl.version || '1.0.0',
              downloadLimit: dl.downloadLimit || null,
              expiryDate: dl.expiryDate || null,
            },
            { transaction }
          );
        }
      }

      // 10. Create Option Sets & Variants if variable product
      if (payload.optionSets && Array.isArray(payload.optionSets)) {
        for (const optSet of payload.optionSets) {
          const createdSet = await ProductOptionSet.create(
            {
              tenantId,
              storeId,
              productId: product.id,
              name: optSet.name,
            },
            { transaction }
          );

          if (optSet.values && Array.isArray(optSet.values)) {
            for (const val of optSet.values) {
              await ProductOptionValue.create(
                {
                  optionSetId: createdSet.id,
                  value: typeof val === 'string' ? val : val.value,
                },
                { transaction }
              );
            }
          }
        }
      }

      if (payload.variants && Array.isArray(payload.variants)) {
        for (const v of payload.variants) {
          await ProductVariant.create(
            {
              productId: product.id,
              sku: v.sku || `${product.sku}-${Math.random().toString(36).substring(7)}`,
              barcode: v.barcode || null,
              price: v.price || product.price,
              weight: v.weight || product.weight,
              imageUrl: v.imageUrl || null,
            },
            { transaction }
          );
        }
      }

      // 11. Initial Version History Entry
      await ProductVersion.create(
        {
          productId: product.id,
          versionNumber: 1,
          changedBy: userId,
          changeSummary: 'Initial Product Creation',
        },
        { transaction }
      );

      await transaction.commit();

      // Audit Log
      await createAuditLog({
        tenantId,
        actorId: userId,
        action: 'product.created',
        entityType: 'Product',
        entityId: String(product.id),
      });

      logger.info(`[StoreProductService] Product created ID ${product.id} on store ${storeId}`);
      return await this.getProductById(tenantId, storeId, product.id);
    } catch (error: any) {
      await transaction.rollback();
      logger.error(`[StoreProductService] Create product error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update Product
   */
  static async updateProduct(
    tenantId: number,
    storeId: number,
    userId: number,
    id: number,
    payload: any
  ) {
    const product = await Product.findOne({ where: { id, tenantId, storeId } });
    if (!product) {
      throw new Error('Product not found');
    }

    const transaction = await sequelize.transaction();

    try {
      await product.update(
        {
          name: payload.name !== undefined ? payload.name : product.name,
          status: payload.status !== undefined ? payload.status : product.status,
          visibility: payload.visibility !== undefined ? payload.visibility : product.visibility,
          price: payload.price !== undefined ? payload.price : product.price,
          description:
            payload.description !== undefined ? payload.description : product.description,
          updatedBy: userId,
        },
        { transaction }
      );

      // Save new version entry
      const lastVersion = await ProductVersion.max('version_number', {
        where: { productId: id },
        transaction,
      });

      await ProductVersion.create(
        {
          productId: id,
          versionNumber: (Number(lastVersion) || 1) + 1,
          changedBy: userId,
          changeSummary: payload.changeSummary || 'Product details updated',
        },
        { transaction }
      );

      await transaction.commit();

      await createAuditLog({
        tenantId,
        actorId: userId,
        action: 'product.updated',
        entityType: 'Product',
        entityId: String(id),
      });

      return await this.getProductById(tenantId, storeId, id);
    } catch (error: any) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Soft Delete Product
   */
  static async deleteProduct(tenantId: number, storeId: number, userId: number, id: number) {
    const product = await Product.findOne({ where: { id, tenantId, storeId } });
    if (!product) {
      throw new Error('Product not found');
    }

    await product.destroy();

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'product.deleted',
      entityType: 'Product',
      entityId: String(id),
    });

    return true;
  }

  /**
   * Execute Bulk Actions
   */
  static async bulkAction(
    tenantId: number,
    storeId: number,
    userId: number,
    action: string,
    ids: number[]
  ) {
    if (!ids || !ids.length) {
      throw new Error('No product IDs provided');
    }

    let affectedCount = 0;

    if (action === 'publish') {
      [affectedCount] = await Product.update(
        { status: 'active', updatedBy: userId },
        { where: { id: { [Op.in]: ids }, tenantId, storeId } }
      );
    } else if (action === 'draft') {
      [affectedCount] = await Product.update(
        { status: 'draft', updatedBy: userId },
        { where: { id: { [Op.in]: ids }, tenantId, storeId } }
      );
    } else if (action === 'delete') {
      affectedCount = await Product.destroy({
        where: { id: { [Op.in]: ids }, tenantId, storeId },
      });
    } else {
      throw new Error(`Unsupported bulk action: ${action}`);
    }

    await createAuditLog({
      tenantId,
      actorId: userId,
      action: 'product.bulk_action',
      entityType: 'Product',
      entityId: '0',
    });

    return { affectedCount, action };
  }
}
