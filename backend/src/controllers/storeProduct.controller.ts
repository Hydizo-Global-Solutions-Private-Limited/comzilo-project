/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { StoreProductService } from '../services/storeProduct.service';
import { success, badRequest, notFound, created } from '../shared/responses';
import { logger } from '../shared/logging/logger';

export class StoreProductController {
  /**
   * GET /api/v1/store/products
   */
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.context?.tenantId || Number((req.user as any)?.tenantId);
      const storeId = (req as any).storeId || Number((req.user as any)?.storeId) || null;

      if (!tenantId) {
        badRequest(res, 'Tenant context missing');
        return;
      }

      const result = await StoreProductService.getProducts(tenantId, storeId, req.query);
      success(res, 'Products retrieved successfully', result);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`[StoreProductController] Get products error: ${err.message}`);
      badRequest(res, err.message);
    }
  }

  /**
   * GET /api/v1/store/products/:id
   */
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.context?.tenantId || Number((req.user as any)?.tenantId) || 1;
      const storeId = (req as any).storeId || Number((req.user as any)?.storeId) || 1;
      const id = parseInt(req.params.id, 10);

      const product = await StoreProductService.getProductById(tenantId, storeId, id);
      success(res, 'Product details retrieved successfully', product);
    } catch (error: unknown) {
      const err = error as Error;
      notFound(res, err.message);
    }
  }

  /**
   * POST /api/v1/store/products
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.context?.tenantId || Number((req.user as any)?.tenantId);
      const storeId = (req as any).storeId || Number((req.user as any)?.storeId) || 1;
      const userId = Number((req.user as any)?.id) || 1;

      if (!tenantId) {
        badRequest(res, 'Tenant context missing');
        return;
      }

      const product = await StoreProductService.createProduct(tenantId, storeId, userId, req.body);
      created(res, 'Product created successfully', product);
    } catch (error: unknown) {
      const err = error as Error;
      badRequest(res, err.message);
    }
  }

  /**
   * PATCH /api/v1/store/products/:id
   */
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.context?.tenantId || Number((req.user as any)?.tenantId) || 1;
      const storeId = (req as any).storeId || Number((req.user as any)?.storeId) || 1;
      const userId = Number((req.user as any)?.id) || 1;
      const id = parseInt(req.params.id, 10);

      const updated = await StoreProductService.updateProduct(
        tenantId,
        storeId,
        userId,
        id,
        req.body
      );
      success(res, 'Product updated successfully', updated);
    } catch (error: unknown) {
      const err = error as Error;
      badRequest(res, err.message);
    }
  }

  /**
   * DELETE /api/v1/store/products/:id
   */
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.context?.tenantId || Number((req.user as any)?.tenantId);
      const rawStore = req.headers['x-store-id'] || req.query.storeId || (req as any).storeId;
      const storeId = rawStore ? Number(rawStore) : null;
      const userId = req.context?.authenticatedUserId || Number((req.user as any)?.id) || 1;
      const id = parseInt(req.params.id, 10);

      if (!tenantId) {
        badRequest(res, 'Tenant context missing');
        return;
      }

      await StoreProductService.deleteProduct(tenantId, storeId, userId, id);
      success(res, 'Product deleted successfully', null);
    } catch (error: unknown) {
      const err = error as Error;
      badRequest(res, err.message);
    }
  }

  /**
   * POST /api/v1/store/products/bulk-action
   */
  static async bulkAction(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.context?.tenantId || Number((req.user as any)?.tenantId) || 1;
      const storeId = (req as any).storeId || Number((req.user as any)?.storeId) || 1;
      const userId = Number((req.user as any)?.id) || 1;
      const { action, ids } = req.body;

      const result = await StoreProductService.bulkAction(tenantId, storeId, userId, action, ids);
      success(res, 'Bulk action executed successfully', result);
    } catch (error: unknown) {
      const err = error as Error;
      badRequest(res, err.message);
    }
  }
}
