/* eslint-disable @typescript-eslint/no-explicit-any */
import { Category } from '../database/models/category';
import { Brand } from '../database/models/brand';
import { Collection } from '../database/models/collection';
import { Tag } from '../database/models/tag';
import { ProductAttribute } from '../database/models/productAttribute';
import { ProductAttributeValue } from '../database/models/productAttributeValue';
import { Product } from '../database/models/product';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { Op } from 'sequelize';

export class CatalogManagementService {
  // ==========================================
  // 1. CATEGORIES MANAGEMENT (Nested Tree + SEO)
  // ==========================================

  public async getCategoryTree(tenantId: number | null, storeId: number): Promise<any[]> {
    const where: any = { status: { [Op.ne]: 'archived' } };
    if (tenantId !== null) {
      where.tenantId = tenantId;
    }

    const categories = await Category.findAll({
      where,
      order: [['name', 'ASC']],
    });

    const categoryList = categories.map((c) => c.get({ plain: true }));

    const buildTree = (parentId: number | null = null): any[] => {
      return categoryList
        .filter((cat: any) => {
          if (parentId === null) {
            return !cat.parentId;
          }
          return Number(cat.parentId) === Number(parentId);
        })
        .map((cat: any) => ({
          ...cat,
          children: buildTree(cat.id),
        }));
    };

    return buildTree(null);
  }

  public async createCategory(tenantId: number, storeId: number, data: any): Promise<Category> {
    if (!data.name) throw new ValidationError('Category name is required');
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return await Category.create({
      tenantId,
      storeId,
      name: data.name,
      slug,
      parentId: data.parentId ? Number(data.parentId) : null,
      description: data.description || '',
      status: data.status || 'active',
      visibility: data.visibility || 'public',
      seoTitle: data.metaTitle || data.name,
      seoDescription: data.metaDescription || '',
      seoKeywords: data.metaKeywords || '',
      canonicalUrl: data.canonicalUrl || null,
    });
  }

  public async updateCategory(tenantId: number, id: number, data: any): Promise<Category> {
    const category = await Category.findOne({ where: { id, tenantId } });
    if (!category) throw new NotFoundError('Category not found');

    await category.update(data);
    return category;
  }

  public async deleteCategory(tenantId: number, id: number): Promise<void> {
    const category = await Category.findOne({ where: { id, tenantId } });
    if (!category) throw new NotFoundError('Category not found');
    await category.destroy();
  }

  // ==========================================
  // 2. BRANDS MANAGEMENT
  // ==========================================

  public async getBrands(tenantId: number | null, filters: any = {}): Promise<Brand[]> {
    const where: any = {};
    if (tenantId !== null) where.tenantId = tenantId;
    if (filters.isFeatured) where.isFeatured = true;
    if (filters.status) where.status = filters.status;

    return await Brand.findAll({
      where,
      order: [['name', 'ASC']],
    });
  }

  public async createBrand(tenantId: number, storeId: number, data: any): Promise<Brand> {
    if (!data.name) throw new ValidationError('Brand name is required');
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return await Brand.create({
      tenantId,
      storeId,
      name: data.name,
      slug,
      logoUrl: data.logoUrl || null,
      bannerUrl: data.bannerUrl || null,
      description: data.description || '',
      isFeatured: Boolean(data.isFeatured),
      status: data.status || 'active',
      metaTitle: data.metaTitle || data.name,
      metaDescription: data.metaDescription || '',
    });
  }

  public async updateBrand(tenantId: number, id: number, data: any): Promise<Brand> {
    const brand = await Brand.findOne({ where: { id, tenantId } });
    if (!brand) throw new NotFoundError('Brand not found');
    await brand.update(data);
    return brand;
  }

  public async deleteBrand(tenantId: number, id: number): Promise<void> {
    const brand = await Brand.findOne({ where: { id, tenantId } });
    if (!brand) throw new NotFoundError('Brand not found');
    await brand.destroy();
  }

  // ==========================================
  // 3. COLLECTIONS MANAGEMENT (Manual & Smart Rules)
  // ==========================================

  public async getCollections(tenantId: number | null, filters: any = {}): Promise<Collection[]> {
    const where: any = {};
    if (tenantId !== null) where.tenantId = tenantId;
    if (filters.type) where.type = filters.type;
    if (filters.isFeatured) where.isFeatured = true;

    return await Collection.findAll({
      where,
      order: [['name', 'ASC']],
    });
  }

  public async createCollection(tenantId: number, storeId: number, data: any): Promise<Collection> {
    if (!data.name) throw new ValidationError('Collection name is required');
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return await Collection.create({
      tenantId,
      storeId,
      name: data.name,
      slug,
      type: data.type || 'manual', // manual, smart, seasonal, flash_sale, homepage
      description: data.description || '',
      bannerUrl: data.bannerUrl || null,
      isFeatured: Boolean(data.isFeatured),
      rulesJson: data.rulesJson ? JSON.stringify(data.rulesJson) : null,
      status: data.status || 'active',
    });
  }

  // ==========================================
  // 4. PRODUCT ATTRIBUTES & VALUES MANAGEMENT
  // ==========================================

  public async getAttributes(tenantId: number | null): Promise<ProductAttribute[]> {
    const where: any = {};
    if (tenantId !== null) where.tenantId = tenantId;

    return await ProductAttribute.findAll({
      where,
      include: [{ model: ProductAttributeValue, as: 'values' }],
      order: [['name', 'ASC']],
    });
  }

  public async createAttribute(
    tenantId: number,
    storeId: number,
    data: any
  ): Promise<ProductAttribute> {
    if (!data.name) throw new ValidationError('Attribute name is required');

    const attr = await ProductAttribute.create({
      tenantId,
      storeId: data.storeId || storeId || 1,
      name: data.name,
      code: data.code || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      type: data.type || 'select', // text, select, color, number
    });

    if (Array.isArray(data.values) && data.values.length > 0) {
      for (const val of data.values) {
        await ProductAttributeValue.create({
          attributeId: attr.id,
          value: typeof val === 'string' ? val : val.value,
          swatchData: val.colorCode || null,
        });
      }
    }

    return attr;
  }

  // ==========================================
  // 5. PRODUCT TAGS MANAGEMENT
  // ==========================================

  public async getTags(tenantId: number | null): Promise<Tag[]> {
    const where: any = {};
    if (tenantId !== null) where.tenantId = tenantId;
    return await Tag.findAll({ where, order: [['name', 'ASC']] });
  }

  public async createTag(tenantId: number, storeId: number, data: any): Promise<Tag> {
    if (!data.name) throw new ValidationError('Tag name is required');
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return await Tag.create({
      tenantId,
      storeId: data.storeId || storeId || 1,
      name: data.name,
      slug,
    });
  }

  // ==========================================
  // 6. DYNAMIC FILTERS & FEATURED CONTENT ENGINE
  // ==========================================

  public async getCatalogFilters(tenantId: number | null): Promise<any> {
    const [categories, brands, attributes] = await Promise.all([
      this.getCategoryTree(tenantId, 1),
      this.getBrands(tenantId, { status: 'active' }),
      this.getAttributes(tenantId),
    ]);

    const priceBounds = await Product.findOne({
      attributes: [
        [Product.sequelize!.fn('MIN', Product.sequelize!.col('price')), 'minPrice'],
        [Product.sequelize!.fn('MAX', Product.sequelize!.col('price')), 'maxPrice'],
      ],
      raw: true,
    });

    return {
      categories,
      brands,
      attributes,
      priceRange: {
        min: Number((priceBounds as any)?.minPrice || 0),
        max: Number((priceBounds as any)?.maxPrice || 10000),
      },
    };
  }
}
