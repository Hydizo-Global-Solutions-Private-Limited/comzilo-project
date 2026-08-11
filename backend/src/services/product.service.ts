/* eslint-disable @typescript-eslint/no-explicit-any */
import { Op } from 'sequelize';
import { ProductRepository } from '../repositories/product.repository';
import { ProductMediaRepository } from '../repositories/productMedia.repository';
import { MediaRepository } from '../repositories/media.repository';
import { Product } from '../database/models/product';
import { Media } from '../database/models/media';
import { ProductMedia } from '../database/models/productMedia';
import { ProductType } from '../database/models/productType';
import { NotFoundError, ConflictError } from '../shared/errors/AppError';
import { sequelize } from '../config/database';

export class ProductService {
  private productRepo: ProductRepository;
  private productMediaRepo: ProductMediaRepository;
  private mediaRepo: MediaRepository;

  constructor() {
    this.productRepo = new ProductRepository();
    this.productMediaRepo = new ProductMediaRepository();
    this.mediaRepo = new MediaRepository();
  }

  /**
   * Generates a unique slug for a product based on its name within a store.
   */
  private async generateUniqueSlug(
    tenantId: number,
    storeId: number,
    name: string,
    excludeId?: number
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const whereClause: any = { storeId, slug };
      if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
      }

      const existing = await this.productRepo.findOne(tenantId, {
        where: whereClause,
        paranoid: false,
      });
      if (!existing) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    return slug;
  }

  public async createProduct(
    tenantId: number,
    storeId: number,
    userId: number,
    data: any,
    mediaIds?: number[]
  ): Promise<Product> {
    // Check SKU uniqueness
    try {
      const existingSku = await this.productRepo.findOne(tenantId, {
        where: { storeId, sku: data.sku },
        paranoid: false,
      });
      if (existingSku) {
        throw new ConflictError(`Product with SKU '${data.sku}' already exists in this store.`);
      }
    } catch (err) {
      console.error('CREATE PRODUCT FINDEONE ERROR:', err);
      throw err;
    }

    // Generate unique slug
    let slug = data.slug;
    if (!slug) {
      slug = await this.generateUniqueSlug(tenantId, storeId, data.name);
    } else {
      // Verify provided slug uniqueness
      const existingSlug = await this.productRepo.findOne(tenantId, {
        where: { storeId, slug },
        paranoid: false,
      });
      if (existingSlug) {
        throw new ConflictError(`Product with Slug '${slug}' already exists in this store.`);
      }
    }

    // Ensure default status is 'published' and default visibility is 'public'
    const status = data.status && String(data.status).trim() ? data.status : 'published';
    const visibility = data.visibility || 'public';
    const productType = data.productType || 'physical';

    return sequelize.transaction(async (t) => {
      const product = await this.productRepo.create(
        tenantId,
        {
          ...data,
          status,
          visibility,
          productType,
          storeId,
          slug,
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction: t }
      );

      // Handle media associations if provided
      if (mediaIds && mediaIds.length > 0) {
        for (let i = 0; i < mediaIds.length; i++) {
          await this.productMediaRepo.create(
            tenantId,
            {
              productId: product.id,
              mediaId: mediaIds[i],
              isPrimary: i === 0,
              sortOrder: i,
            },
            { transaction: t }
          );
        }
      }

      // Handle variant payload or auto-generate fallback variants for variable products
      const { ProductVariantService } = require('./productVariant.service');
      const variantService = new ProductVariantService();

      if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
        for (const vData of data.variants) {
          await variantService.createVariant(
            tenantId,
            {
              ...vData,
              productId: product.id,
              storeId,
            },
            { transaction: t }
          );
        }
      } else if (productType === 'variable') {
        const isTech =
          product.name.toLowerCase().includes('hp') ||
          product.name.toLowerCase().includes('dell') ||
          product.name.toLowerCase().includes('laptop') ||
          product.name.toLowerCase().includes('mac') ||
          product.name.toLowerCase().includes('pc') ||
          product.name.toLowerCase().includes('tech') ||
          product.name.toLowerCase().includes('pro');
        const rams = isTech ? ['8GB', '16GB'] : ['S', 'M', 'L'];
        const memories = isTech ? ['12GB', '32GB'] : ['Cotton', 'Polyester'];
        const colours = ['Black', 'Silver', 'Green'];
        const ramLabel = isTech ? 'RAM' : 'Size';
        const memLabel = isTech ? 'Memory' : 'Material';

        for (const ram of rams) {
          for (const mem of memories) {
            for (const col of colours) {
              const sku = `${product.sku}-${ram}-${mem}-${col.toUpperCase()}`;
              await variantService.createVariant(
                tenantId,
                {
                  productId: product.id,
                  storeId,
                  sku,
                  price: product.price || 199.0,
                  stockQuantity: 50,
                  status: 'active',
                  attributes: [
                    { attributeName: ramLabel, attributeValue: ram },
                    { attributeName: memLabel, attributeValue: mem },
                    { attributeName: 'Colour', attributeValue: col },
                  ],
                },
                { transaction: t }
              );
            }
          }
        }
      }

      // Handle product_images table entries if imageUrls or images provided
      if (data.images && Array.isArray(data.images)) {
        const { ProductImage } = require('../database/models');
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          const imageUrl = typeof img === 'string' ? img : img.imageUrl || img.url;
          if (imageUrl) {
            await ProductImage.create(
              {
                productId: product.id,
                imageUrl,
                url: imageUrl,
                thumbnailUrl: typeof img === 'object' ? img.thumbnailUrl : imageUrl,
                displayOrder: i,
                isPrimary: i === 0 || (typeof img === 'object' && Boolean(img.isPrimary)),
              },
              { transaction: t }
            );
          }
        }
      }

      return product;
    });
  }

  public async updateProduct(
    tenantId: number,
    storeId: number,
    productId: number,
    userId: number,
    data: any,
    mediaIds?: number[]
  ): Promise<Product> {
    const product = await this.productRepo.findOne(tenantId, { where: { id: productId, storeId } });
    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    if (data.sku && data.sku !== product.sku) {
      const existingSku = await this.productRepo.findOne(tenantId, {
        where: { storeId, sku: data.sku },
        paranoid: false,
      });
      if (existingSku && existingSku.id !== productId) {
        throw new ConflictError(`Product with SKU '${data.sku}' already exists in this store.`);
      }
    }

    return sequelize.transaction(async (t) => {
      await product.update(
        {
          ...data,
          updatedBy: userId,
        },
        { transaction: t }
      );

      if (mediaIds !== undefined) {
        await this.productMediaRepo.destroy(tenantId, {
          where: { productId },
          transaction: t,
        });

        for (let i = 0; i < mediaIds.length; i++) {
          await this.productMediaRepo.create(
            tenantId,
            {
              productId,
              mediaId: mediaIds[i],
              isPrimary: i === 0,
              sortOrder: i,
            },
            { transaction: t }
          );
        }
      }

      return product;
    });
  }

  public async getProduct(
    tenantId: number | null,
    storeId: number,
    productId: number
  ): Promise<Product> {
    const {
      ProductImage,
      ProductVariant,
      VariantAttribute,
      VariantImage,
    } = require('../database/models');
    const product = await this.productRepo.findOne(null, {
      where: { id: productId },
      include: [
        {
          model: ProductImage,
          as: 'images',
        },
        {
          model: ProductVariant,
          as: 'variants',
          include: [
            {
              model: VariantAttribute,
              as: 'attributes',
            },
            {
              model: VariantImage,
              as: 'images',
            },
          ],
        },
      ],
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  public async getProductTypes(): Promise<any[]> {
    return await ProductType.findAll({
      where: { status: 'active' },
      order: [['id', 'ASC']],
    });
  }

  public async listProducts(
    tenantId: number | null,
    storeId: number,
    filters: any = {}
  ): Promise<{ rows: Product[]; count: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      visibility,
      category,
      brand,
      productType,
      types,
      minPrice,
      maxPrice,
      allStores,
      sortBy,
      sort,
    } = filters;
    const offset = (page - 1) * limit;

    const where: any = {};

    // Filter by storeId unless allStores is explicitly requested
    if (!allStores && storeId) {
      where.storeId = storeId;
    }

    if (status) where.status = status;
    if (visibility) where.visibility = visibility;
    if (category) where.category = category;
    if (brand) where.brandId = brand;

    // Multi-type backend filtering (e.g. types=physical,print_on_demand)
    const rawTypes = productType || types || filters.product_type;
    if (rawTypes) {
      const typeList = Array.isArray(rawTypes)
        ? rawTypes
        : String(rawTypes)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
      if (typeList.length > 0) {
        where.productType = { [Op.in]: typeList };
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price[Op.gte] = Number(minPrice);
      if (maxPrice !== undefined) where.price[Op.lte] = Number(maxPrice);
    }

    if (search) {
      const trimmedSearch = String(search).trim();
      const searchPattern = `%${trimmedSearch}%`;

      const orConditions: any[] = [
        { name: { [Op.like]: searchPattern } },
        { category: { [Op.like]: searchPattern } },
        { brand: { [Op.like]: searchPattern } },
        { sku: { [Op.like]: searchPattern } },
        { barcode: { [Op.like]: searchPattern } },
        { slug: { [Op.like]: searchPattern } },
        { shortDescription: { [Op.like]: searchPattern } },
        { description: { [Op.like]: searchPattern } },
      ];

      // Singular/plural term fallback (e.g. 'laptop' <-> 'laptops', 'shoe' <-> 'shoes')
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

    // Dynamic order clause based on sortBy filter
    let orderClause: any[] = [['createdAt', 'DESC']];
    const effectiveSort = sortBy || sort || filters.sort_by;
    if (
      effectiveSort === 'price-low' ||
      effectiveSort === 'price_asc' ||
      effectiveSort === 'price-asc'
    ) {
      orderClause = [['price', 'ASC']];
    } else if (
      effectiveSort === 'price-high' ||
      effectiveSort === 'price_desc' ||
      effectiveSort === 'price-desc'
    ) {
      orderClause = [['price', 'DESC']];
    } else if (effectiveSort === 'name-asc' || effectiveSort === 'name_asc') {
      orderClause = [['name', 'ASC']];
    } else if (effectiveSort === 'name-desc' || effectiveSort === 'name_desc') {
      orderClause = [['name', 'DESC']];
    } else if (effectiveSort === 'newest') {
      orderClause = [['createdAt', 'DESC']];
    }

    // For public storefront requests with allStores, do not restrict query to single tenantId
    const effectiveTenantId = allStores ? null : tenantId;

    const { ProductImage } = require('../database/models');
    const [rows, count] = await Promise.all([
      this.productRepo.findMany(effectiveTenantId, {
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: orderClause,
        include: [
          {
            model: ProductImage,
            as: 'images',
          },
        ],
      }),
      this.productRepo.count(effectiveTenantId, { where }),
    ]);

    return { rows, count };
  }

  public async deleteProduct(
    tenantId: number,
    storeId: number,
    productId: number,
    userId: number
  ): Promise<void> {
    await this.getProduct(tenantId, storeId, productId);

    await sequelize.transaction(async (t) => {
      // Mark updatedBy before soft deleting
      await this.productRepo.update(tenantId, productId, { updatedBy: userId }, { transaction: t });
      await this.productRepo.delete(tenantId, productId, { transaction: t });
    });
  }

  public async restoreProduct(
    tenantId: number,
    storeId: number,
    productId: number,
    userId: number
  ): Promise<Product> {
    const product = await this.productRepo.findOne(tenantId, {
      where: { id: productId, storeId },
      paranoid: false, // Include soft-deleted
    });

    if (!product) {
      throw new NotFoundError('Product not found in this store.');
    }

    if (!product.deletedAt) {
      throw new ConflictError('Product is not deleted.');
    }

    await sequelize.transaction(async (t) => {
      await this.productRepo.update(
        tenantId,
        productId,
        { deletedAt: null, updatedBy: userId } as any,
        {
          paranoid: false,
          transaction: t,
        }
      );
    });

    return this.getProduct(tenantId, storeId, productId);
  }
}
