import Joi from 'joi';

export const productValidation = {
  createProduct: Joi.object({
    name: Joi.string().max(255).required(),
    slug: Joi.string().max(255).optional(),
    sku: Joi.string().max(100).required(),
    shortDescription: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('', null).optional(),
    status: Joi.string()
      .valid('draft', 'active', 'published', 'pending_approval', 'archived', 'deleted')
      .default('draft'),
    visibility: Joi.string().valid('public', 'private', 'hidden').default('public'),
    productType: Joi.string()
      .valid('physical', 'variable', 'virtual', 'downloadable', 'print_on_demand')
      .optional(),
    product_type: Joi.string()
      .valid('physical', 'variable', 'virtual', 'downloadable', 'print_on_demand')
      .optional(),
    brand: Joi.string().max(100).allow('', null).optional(),
    category: Joi.string().max(100).allow('', null).optional(),
    price: Joi.number().min(0).required(),
    comparePrice: Joi.number().min(0).allow(null).optional(),
    cost: Joi.number().min(0).allow(null).optional(),
    costPrice: Joi.number().min(0).allow(null).optional(),
    weight: Joi.number().min(0).allow(null).optional(),
    dimensions: Joi.string().max(100).allow('', null).optional(),
    barcode: Joi.string().max(100).allow('', null).optional(),
    taxClass: Joi.string().max(50).allow('', null).optional(),
    seoTitle: Joi.string().max(255).allow('', null).optional(),
    seoDescription: Joi.string().max(500).allow('', null).optional(),
    seoKeywords: Joi.string().max(255).allow('', null).optional(),
    canonicalUrl: Joi.string().max(2048).allow('', null).optional(),
    mediaIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    images: Joi.array()
      .items(
        Joi.object({
          imageUrl: Joi.string().allow('', null).optional(),
          thumbnailUrl: Joi.string().allow('', null).optional(),
          displayOrder: Joi.number().integer().optional(),
          isPrimary: Joi.boolean().optional(),
        })
      )
      .optional(),
    categoryId: Joi.number().integer().positive().allow(null).optional(),
    category_id: Joi.number().integer().positive().allow(null).optional(),
    variants: Joi.array()
      .items(
        Joi.object({
          sku: Joi.string().required(),
          barcode: Joi.string().allow('', null).optional(),
          price: Joi.number().min(0).required(),
          compareAtPrice: Joi.number().min(0).allow(null).optional(),
          costPrice: Joi.number().min(0).allow(null).optional(),
          stockQuantity: Joi.number().integer().min(0).optional(),
          status: Joi.string().optional(),
          attributes: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().optional(),
                attributeName: Joi.string().optional(),
                value: Joi.string().optional(),
                attributeValue: Joi.string().optional(),
              })
            )
            .optional(),
          images: Joi.array().optional(),
        })
      )
      .optional(),
    dynamicAttributes: Joi.object().optional(),
  }),

  updateProduct: Joi.object({
    name: Joi.string().max(255).optional(),
    slug: Joi.string().max(255).optional(),
    sku: Joi.string().max(100).optional(),
    shortDescription: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('', null).optional(),
    status: Joi.string()
      .valid('draft', 'active', 'published', 'pending_approval', 'archived', 'deleted')
      .optional(),
    visibility: Joi.string().valid('public', 'private', 'hidden').optional(),
    productType: Joi.string().max(50).optional(),
    product_type: Joi.string().max(50).optional(),
    brand: Joi.string().max(100).allow('', null).optional(),
    category: Joi.string().max(100).allow('', null).optional(),
    price: Joi.number().min(0).optional(),
    comparePrice: Joi.number().min(0).allow(null).optional(),
    cost: Joi.number().min(0).allow(null).optional(),
    costPrice: Joi.number().min(0).allow(null).optional(),
    weight: Joi.number().min(0).allow(null).optional(),
    dimensions: Joi.string().max(100).allow('', null).optional(),
    barcode: Joi.string().max(100).allow('', null).optional(),
    taxClass: Joi.string().max(50).allow('', null).optional(),
    seoTitle: Joi.string().max(255).allow('', null).optional(),
    seoDescription: Joi.string().max(500).allow('', null).optional(),
    seoKeywords: Joi.string().max(255).allow('', null).optional(),
    canonicalUrl: Joi.string().max(2048).allow('', null).optional(),
    mediaIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    dynamicAttributes: Joi.object().optional(),
  }),

  listProducts: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow('').optional(),
    status: Joi.string().allow('').optional(),
    visibility: Joi.string().allow('').optional(),
    category: Joi.string().allow('').optional(),
    brand: Joi.string().allow('').optional(),
    productType: Joi.string().allow('').optional(),
    types: Joi.string().allow('').optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    sortBy: Joi.string().allow('').optional(),
    sort: Joi.string().allow('').optional(),
    sort_by: Joi.string().allow('').optional(),
    sortOrder: Joi.string().allow('').optional(),
  }),
};
