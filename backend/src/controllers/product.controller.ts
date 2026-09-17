import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ProductService } from '../services/product.service';
import { createAuditLog } from '../utils/auditHelper';
import { RESPONSE_MESSAGES } from '../shared/constants';
import { success, created } from '../shared/responses';
import { ValidationError, NotFoundError } from '../shared/errors/AppError';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  private async getStoreId(req: Request): Promise<number> {
    const rawStoreId =
      req.headers['x-store-id'] || req.query.storeId || req.body.storeId || req.context?.storeId;
    if (rawStoreId) {
      const parsed = Number(rawStoreId);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    const tenantId = req.context?.tenantId;
    if (tenantId) {
      const [store]: any = await sequelize.query(
        'SELECT id FROM stores WHERE tenant_id = :tenantId ORDER BY id ASC LIMIT 1',
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      );
      if (store && store.id) {
        return Number(store.id);
      }
    }

    throw new ValidationError('Store context is missing');
  }

  public createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = await this.getStoreId(req);
      const userId = req.context?.authenticatedUserId || 1;
      const { mediaIds, ...productData } = req.body;

      const product = await this.productService.createProduct(
        tenantId,
        storeId,
        userId,
        productData,
        mediaIds
      );

      await createAuditLog(
        {
          tenantId,
          action: 'product.create',
          entityType: 'product',
          entityId: String(product.id),
          newValues: product.toJSON(),
        },
        req.context
      );

      created(res, 'Product created successfully', product);
    } catch (error) {
      next(error);
    }
  };

  public updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const productId = parseInt(req.params.id, 10);
      const { mediaIds, ...productData } = req.body;

      // Detect status or price changes for specific audit logs
      const oldProduct = await this.productService.getProduct(tenantId, storeId, productId);

      const product = await this.productService.updateProduct(
        tenantId,
        storeId,
        productId,
        userId,
        productData,
        mediaIds
      );

      let action = 'product.update';
      if (
        productData.price !== undefined &&
        Number(productData.price) !== Number(oldProduct.price)
      ) {
        action = 'product.update.price';
      } else if (productData.status !== undefined && productData.status !== oldProduct.status) {
        action = 'product.update.status';
      }

      await createAuditLog(
        {
          tenantId,
          action,
          entityType: 'product',
          entityId: String(product.id),
          previousValues: oldProduct.toJSON(),
          newValues: product.toJSON(),
        },
        req.context
      );

      success(res, 'Product updated successfully', product);
    } catch (error) {
      next(error);
    }
  };

  public getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      let storeId = 1;
      try {
        storeId = await this.getStoreId(req);
      } catch {
        storeId = 1;
      }
      const productId = parseInt(req.params.id, 10);

      const product = await this.productService.getProduct(tenantId, storeId, productId);

      success(res, RESPONSE_MESSAGES.SUCCESS, product);
    } catch (error) {
      next(error);
    }
  };

  public getProductTypes = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const types = await this.productService.getProductTypes();
      success(res, 'Product types retrieved successfully', types);
    } catch (error) {
      next(error);
    }
  };

  public listProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryTenantId = req.query.tenant_id ? Number(req.query.tenant_id) : undefined;
      const queryStoreId = req.query.store_id ? Number(req.query.store_id) : undefined;
      const queryStoreSlug = (req.query.store || req.query.tenant || req.headers['x-store-slug'] || req.headers['x-tenant-slug']) as string | undefined;

      let tenantId: number | null = queryTenantId || (req.context?.tenantId && req.context.tenantId !== 1 ? req.context.tenantId : null);
      let storeId: number | null = queryStoreId || req.context?.storeId || null;

      // 1. If store slug or store name is provided, resolve from stores/tenants
      if (queryStoreSlug && typeof queryStoreSlug === 'string' && (!tenantId || !storeId)) {
        const rawInput = queryStoreSlug.trim();
        const slugified = rawInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const alphanumeric = rawInput.toLowerCase().replace(/[^a-z0-9]/g, '');

        const [storeRes]: any = await sequelize.query(
          `SELECT id, tenant_id, slug FROM stores 
           WHERE status = 'active' AND (
             slug = :rawInput OR slug = :slugified OR LOWER(name) = LOWER(:rawInput) OR LOWER(name) = :slugified OR
             slug LIKE :likeAlpha OR LOWER(name) LIKE :likeAlpha
           ) LIMIT 1`,
          {
            replacements: { rawInput, slugified, likeAlpha: `%${alphanumeric}%` },
            type: QueryTypes.SELECT,
          }
        );
        if (storeRes) {
          tenantId = Number(storeRes.tenant_id);
          storeId = Number(storeRes.id);
        } else {
          const [tRes]: any = await sequelize.query(
            `SELECT id FROM tenants 
             WHERE status = 'active' AND (
               slug = :rawInput OR slug = :slugified OR LOWER(name) = LOWER(:rawInput) OR LOWER(name) = :slugified OR
               slug LIKE :likeAlpha OR LOWER(name) LIKE :likeAlpha
             ) LIMIT 1`,
            {
              replacements: { rawInput, slugified, likeAlpha: `%${alphanumeric}%` },
              type: QueryTypes.SELECT,
            }
          );
          if (tRes) {
            tenantId = Number(tRes.id);
            const [tStore]: any = await sequelize.query(
              'SELECT id FROM stores WHERE tenant_id = :tId AND status = "active" ORDER BY id ASC LIMIT 1',
              { replacements: { tId: tenantId }, type: QueryTypes.SELECT }
            );
            if (tStore) storeId = Number(tStore.id);
          }
        }
      }

      // 2. If authenticated customer/seller without explicit store, resolve customer's registered store/tenant
      if ((!tenantId || tenantId === 1) && !queryStoreSlug && req.headers.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded: any = jwt.decode(token);
          if (decoded && (decoded.userId || decoded.id)) {
            const uId = decoded.userId || decoded.id;
            const [userRow]: any = await sequelize.query(
              'SELECT tenant_id FROM users WHERE id = :uId LIMIT 1',
              { replacements: { uId }, type: QueryTypes.SELECT }
            );
            const userTenantId = userRow && userRow.tenant_id ? Number(userRow.tenant_id) : 1;

            if (userTenantId > 1) {
              const [cust]: any = await sequelize.query(
                `SELECT tenant_id, store_id FROM customers 
                 WHERE (user_id = :uId OR email = :email) AND tenant_id = :userTenantId AND deleted_at IS NULL
                 ORDER BY id DESC LIMIT 1`,
                { replacements: { uId, email: decoded.email || '', userTenantId }, type: QueryTypes.SELECT }
              );
              if (cust && cust.tenant_id && Number(cust.tenant_id) > 1) {
                tenantId = Number(cust.tenant_id);
                storeId = cust.store_id ? Number(cust.store_id) : storeId;
              }
            } else {
              // Customer is registered on main marketplace (tenant 1): do not scope to any single seller
              tenantId = null;
              storeId = null;
            }
          }
        } catch {
          // fallback
        }
      }

      // If authenticated seller request without explicit store query, resolve seller storeId
      if (!storeId && req.headers.authorization && tenantId && tenantId > 1) {
        try {
          storeId = await this.getStoreId(req);
        } catch {
          // fallback
        }
      }

      // If customer or visitor is scoped to a specific seller tenant (> 1), restrict products strictly to that seller!
      const isSellerScoped = Boolean(tenantId && tenantId > 1);
      const isMarketplaceRequest = !isSellerScoped || req.query.marketplace === 'true';

      const filters: any = {
        ...req.query,
        allStores: isMarketplaceRequest,
      };

      const products = await this.productService.listProducts(
        isSellerScoped ? tenantId : null,
        isSellerScoped ? (storeId || 1) : 1,
        filters
      );

      success(res, RESPONSE_MESSAGES.SUCCESS, products.rows, {
        total: products.count,
        page: parseInt((filters.page as string) || '1', 10),
        limit: parseInt((filters.limit as string) || '10', 10),
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = await this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const productId = parseInt(req.params.id, 10);

      const product = await this.productService.getProduct(tenantId, storeId, productId);

      await this.productService.deleteProduct(tenantId, storeId, productId, userId);

      await createAuditLog(
        {
          tenantId,
          action: 'product.delete',
          entityType: 'product',
          entityId: String(productId),
          previousValues: product.toJSON(),
        },
        req.context
      );

      success(res, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public restoreProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = Number(req.headers['x-store-id'] || req.query.storeId || req.body.storeId);
      if (!storeId || isNaN(storeId)) {
        throw new ValidationError('Store context is missing');
      }
      const userId = req.context!.authenticatedUserId!;
      const productId = parseInt(req.params.id, 10);

      const product = await this.productService.restoreProduct(
        tenantId,
        storeId,
        productId,
        userId
      );

      await createAuditLog(
        {
          tenantId,
          action: 'product.restore',
          entityType: 'product',
          entityId: String(productId),
          newValues: product.toJSON(),
        },
        req.context
      );

      success(res, 'Product restored successfully', product);
    } catch (error) {
      next(error);
    }
  };

  public uploadProductImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const file = req.file;

      let imageUrl = req.body.imageUrl || req.body.url;
      if (file) {
        imageUrl = `/uploads/products/${file.filename}`;
      }

      if (!imageUrl) {
        throw new ValidationError('No image file or imageUrl provided');
      }

      const { ProductImage } = require('../database/models');
      const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;
      const displayOrder = parseInt(req.body.displayOrder || '0', 10);

      const productImage = await ProductImage.create({
        productId,
        imageUrl,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        displayOrder,
        isPrimary,
      });

      created(res, 'Product image uploaded successfully', productImage);
    } catch (error) {
      next(error);
    }
  };

  public getProductImages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const { ProductImage } = require('../database/models');
      const images = await ProductImage.findAll({
        where: { productId },
        order: [
          ['displayOrder', 'ASC'],
          ['id', 'ASC'],
        ],
      });
      success(res, RESPONSE_MESSAGES.SUCCESS, images);
    } catch (error) {
      next(error);
    }
  };

  public deleteProductImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const imageId = parseInt(req.params.imageId, 10);
      const { ProductImage } = require('../database/models');

      const image = await ProductImage.findOne({ where: { id: imageId, productId } });
      if (!image) {
        throw new NotFoundError('Product image not found');
      }

      await image.destroy();
      success(res, 'Product image deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getProductReviews = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const { ProductReview } = require('../database/models');

      const reviews = await ProductReview.findAll({
        where: { productId, status: 'approved' },
        order: [['createdAt', 'DESC']],
      });

      const count = reviews.length;
      let totalScore = 0;
      const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      reviews.forEach((r: any) => {
        const star = Math.min(5, Math.max(1, Number(r.rating) || 5));
        totalScore += star;
        ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;
      });

      const averageRating = count > 0 ? Number((totalScore / count).toFixed(1)) : 5.0;

      success(res, 'Product reviews retrieved successfully', {
        reviews,
        count,
        averageRating,
        ratingBreakdown,
      });
    } catch (error) {
      next(error);
    }
  };

  public createProductReview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = parseInt(req.params.id, 10);
      const { ProductReview } = require('../database/models');
      const { rating, title, comment, customerName, customerEmail } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        throw new ValidationError('Rating must be an integer between 1 and 5');
      }

      if (!comment || !String(comment).trim()) {
        throw new ValidationError('Review comment body is required');
      }

      const nameToUse =
        customerName ||
        (req.context?.authenticatedUserId
          ? `Customer #${req.context.authenticatedUserId}`
          : 'Valued Customer');

      const review = await ProductReview.create({
        tenantId: req.context?.tenantId || 1,
        storeId: 1,
        productId,
        userId: req.context?.authenticatedUserId || null,
        customerName: nameToUse,
        customerEmail: customerEmail || null,
        rating: Number(rating),
        title: title || 'Customer Review',
        comment: String(comment).trim(),
        verifiedPurchase: true,
        status: 'approved',
        helpfulCount: 0,
      });

      created(res, 'Thank you! Your review has been published.', review);
    } catch (error) {
      next(error);
    }
  };

  public markReviewHelpful = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const reviewId = parseInt(req.params.reviewId, 10);
      const { ProductReview } = require('../database/models');

      const review = await ProductReview.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      review.helpfulCount = (review.helpfulCount || 0) + 1;
      await review.save();

      success(res, 'Thank you for your feedback', { helpfulCount: review.helpfulCount });
    } catch (error) {
      next(error);
    }
  };
}
