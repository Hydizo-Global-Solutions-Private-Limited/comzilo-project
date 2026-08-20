/* eslint-disable @typescript-eslint/no-explicit-any */
import { Op } from 'sequelize';
import { BaseService } from '../core/BaseService';
import {
  PodCategory,
  PodTemplate,
  PodCustomization,
  Product,
  Order,
  OrderItem,
} from '../database/models';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';

export class PodService extends BaseService {
  constructor() {
    super('PodService');
  }

  // --- CATEGORIES ---

  public async listCategories(tenantId: number = 1): Promise<PodCategory[]> {
    return await PodCategory.findAll({
      where: { tenantId },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      include: [
        {
          model: PodTemplate,
          as: 'templates',
          where: { isActive: true },
          required: false,
        },
      ],
    });
  }

  public async getCategoryBySlug(slug: string, tenantId: number = 1): Promise<PodCategory> {
    const category = await PodCategory.findOne({
      where: { slug, tenantId },
      include: [
        {
          model: PodTemplate,
          as: 'templates',
          where: { isActive: true },
          required: false,
        },
      ],
    });
    if (!category) {
      throw new NotFoundError(`POD Category '${slug}' not found`);
    }
    return category;
  }

  public async createCategory(tenantId: number = 1, data: any): Promise<PodCategory> {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return await PodCategory.create({
      tenantId,
      name: data.name,
      slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      displayOrder: Number(data.displayOrder) || 0,
    });
  }

  public async updateCategory(id: number, tenantId: number = 1, data: any): Promise<PodCategory> {
    const category = await PodCategory.findOne({ where: { id, tenantId } });
    if (!category) {
      throw new NotFoundError(`POD Category #${id} not found`);
    }
    await category.update(data);
    return category;
  }

  public async deleteCategory(id: number, tenantId: number = 1): Promise<boolean> {
    const category = await PodCategory.findOne({ where: { id, tenantId } });
    if (!category) {
      throw new NotFoundError(`POD Category #${id} not found`);
    }
    await category.destroy();
    return true;
  }

  // --- TEMPLATES ---

  public async listTemplates(tenantId: number = 1, filters: any = {}): Promise<PodTemplate[]> {
    const where: any = { tenantId };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters.categoryId) {
      where.categoryId = Number(filters.categoryId);
    }

    if (filters.sellerId) {
      where.sellerId = Number(filters.sellerId);
    }

    if (filters.productId) {
      where.productId = Number(filters.productId);
    }

    if (filters.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${filters.search.trim()}%` } },
        { code: { [Op.like]: `%${filters.search.trim()}%` } },
        { description: { [Op.like]: `%${filters.search.trim()}%` } },
      ];
    }

    const include: any[] = [
      {
        model: PodCategory,
        as: 'category',
      },
    ];

    if (filters.categorySlug) {
      include[0].where = { slug: filters.categorySlug };
      include[0].required = true;
    }

    return await PodTemplate.findAll({
      where,
      include,
      order: [['id', 'ASC']],
    });
  }

  public async getTemplateById(id: number, tenantId: number = 1): Promise<PodTemplate> {
    const template = await PodTemplate.findOne({
      where: { id, tenantId },
      include: [
        {
          model: PodCategory,
          as: 'category',
        },
      ],
    });
    if (!template) {
      throw new NotFoundError(`POD Template #${id} not found`);
    }
    return template;
  }

  public async createTemplate(
    tenantId: number = 1,
    sellerId: number | null,
    data: any
  ): Promise<PodTemplate> {
    if (!data.title || !data.categoryId) {
      throw new ValidationError('Template title and categoryId are required.');
    }

    const code = data.code || `TMPL-${Date.now().toString().slice(-6)}`;

    return await PodTemplate.create({
      tenantId,
      sellerId: sellerId || null,
      categoryId: Number(data.categoryId),
      productId: data.productId ? Number(data.productId) : null,
      title: data.title,
      code,
      description: data.description || null,
      thumbnailUrl: data.thumbnailUrl || null,
      basePrice: Number(data.basePrice || data.price || 0),
      printableArea: data.printableArea || { x: 20, y: 20, width: 60, height: 60, shape: 'rectangle' },
      canvasJson: data.canvasJson || {},
      allowedColors: data.allowedColors || ['#FFFFFF', '#000000', '#1E293B', '#DC2626', '#2563EB'],
      allowedSizes: data.allowedSizes || ['S', 'M', 'L', 'XL', 'XXL'],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    });
  }

  public async updateTemplate(id: number, tenantId: number = 1, data: any): Promise<PodTemplate> {
    const template = await PodTemplate.findOne({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundError(`POD Template #${id} not found`);
    }
    await template.update({
      ...data,
      basePrice: data.basePrice !== undefined ? Number(data.basePrice) : template.basePrice,
    });
    return template;
  }

  public async toggleTemplateStatus(id: number, tenantId: number = 1, isActive?: boolean): Promise<PodTemplate> {
    const template = await PodTemplate.findOne({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundError(`POD Template #${id} not found`);
    }
    const newStatus = isActive !== undefined ? isActive : !template.isActive;
    await template.update({ isActive: newStatus });
    return template;
  }

  public async deleteTemplate(id: number, tenantId: number = 1): Promise<boolean> {
    const template = await PodTemplate.findOne({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundError(`POD Template #${id} not found`);
    }
    await template.destroy();
    return true;
  }

  // --- CUSTOMIZATIONS ---

  public async saveCustomization(tenantId: number = 1, data: any): Promise<PodCustomization> {
    if (!data.productId) {
      throw new ValidationError('Product ID is required for POD Customization.');
    }

    return await PodCustomization.create({
      tenantId,
      orderId: data.orderId ? Number(data.orderId) : null,
      orderItemId: data.orderItemId || null,
      productId: Number(data.productId),
      templateId: data.templateId ? Number(data.templateId) : null,
      templateName: data.templateName || data.templateTitle || null,
      uploadedImageUrl: data.uploadedImageUrl || data.uploadedImage || null,
      customText: data.customText || null,
      font: data.font || null,
      textColor: data.textColor || null,
      size: data.size || null,
      color: data.color || null,
      previewImageUrl: data.previewImageUrl || data.previewImage || null,
      metaData: data.metaData || data.canvasJson || {},
    });
  }

  public async getCustomizationById(id: number, tenantId: number = 1): Promise<PodCustomization> {
    const custom = await PodCustomization.findOne({
      where: { id, tenantId },
      include: [
        { model: Order, as: 'order' },
        { model: OrderItem, as: 'orderItem' },
        { model: Product, as: 'product' },
        { model: PodTemplate, as: 'template' },
      ],
    });
    if (!custom) {
      throw new NotFoundError(`POD Customization #${id} not found`);
    }
    return custom;
  }

  // --- POD ORDERS ---

  public async listPodOrders(tenantId: number = 1, filters: any = {}): Promise<any[]> {
    const where: any = { tenantId };

    const customizations = await PodCustomization.findAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
        },
        {
          model: OrderItem,
          as: 'orderItem',
        },
        {
          model: Product,
          as: 'product',
        },
        {
          model: PodTemplate,
          as: 'template',
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: filters.limit ? Number(filters.limit) : 100,
    });

    return customizations;
  }

  // --- PRICING RULES ---

  public async calculatePrice(productId: number, templateId?: number, options: any = {}): Promise<{
    basePrice: number;
    templatePrice: number;
    extraArtworkFee: number;
    totalPrice: number;
  }> {
    let basePrice = 25.0;
    if (productId) {
      const product = await Product.findByPk(productId);
      if (product) basePrice = Number(product.price);
    }

    let templatePrice = 0;
    if (templateId) {
      const template = await PodTemplate.findByPk(templateId);
      if (template) templatePrice = Number(template.basePrice);
    }

    let extraArtworkFee = 0;
    if (options.uploadedImage) {
      extraArtworkFee += 2.5;
    }
    if (options.customText && options.customText.length > 20) {
      extraArtworkFee += 1.5;
    }

    const totalPrice = Number((basePrice + templatePrice + extraArtworkFee).toFixed(2));

    return {
      basePrice,
      templatePrice,
      extraArtworkFee,
      totalPrice,
    };
  }
}
