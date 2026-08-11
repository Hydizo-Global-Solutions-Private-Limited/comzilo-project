/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { createAuditLog } from '../utils/auditHelper';
import { RESPONSE_MESSAGES } from '../shared/constants';
import { success, created } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  private getStoreId(req: Request): number {
    const raw =
      req.headers['x-store-id'] ||
      req.headers['X-Store-ID'] ||
      req.query.storeId ||
      req.body.storeId ||
      req.context?.storeId;
    const storeId = Number(raw || 1);
    if (!storeId || isNaN(storeId)) {
      return 1;
    }
    return storeId;
  }

  public createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const category = await this.categoryService.createCategory(
        tenantId,
        storeId,
        userId,
        req.body
      );

      await createAuditLog(
        {
          tenantId,
          action: 'category.create',
          entityType: 'category',
          entityId: String(category.id),
          newValues: category.toJSON(),
        },
        req.context
      );

      created(res, 'Category created successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public getCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const categoryId = parseInt(req.params.id, 10);

      const category = await this.categoryService.getCategory(tenantId, storeId, categoryId);

      success(res, RESPONSE_MESSAGES.SUCCESS, category);
    } catch (error) {
      next(error);
    }
  };

  public listCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const filters = req.query;

      const categories = await this.categoryService.listCategories(tenantId, storeId, filters);

      success(res, RESPONSE_MESSAGES.SUCCESS, categories.rows, {
        total: categories.count,
        page: parseInt((filters.page as string) || '1', 10),
        limit: parseInt((filters.limit as string) || '10', 10),
      });
    } catch (error) {
      next(error);
    }
  };

  public updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const categoryId = parseInt(req.params.id, 10);

      const oldCategory = await this.categoryService.getCategory(tenantId, storeId, categoryId);
      const category = await this.categoryService.updateCategory(
        tenantId,
        storeId,
        categoryId,
        userId,
        req.body
      );

      await createAuditLog(
        {
          tenantId,
          action: 'category.update',
          entityType: 'category',
          entityId: String(category.id),
          previousValues: oldCategory.toJSON(),
          newValues: category.toJSON(),
        },
        req.context
      );

      success(res, 'Category updated successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const categoryId = parseInt(req.params.id, 10);

      const category = await this.categoryService.getCategory(tenantId, storeId, categoryId);
      await this.categoryService.deleteCategory(tenantId, storeId, categoryId, userId);

      await createAuditLog(
        {
          tenantId,
          action: 'category.delete',
          entityType: 'category',
          entityId: String(categoryId),
          previousValues: category.toJSON(),
        },
        req.context
      );

      success(res, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public restoreCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const categoryId = parseInt(req.params.id, 10);

      const category = await this.categoryService.restoreCategory(
        tenantId,
        storeId,
        categoryId,
        userId
      );

      await createAuditLog(
        {
          tenantId,
          action: 'category.restore',
          entityType: 'category',
          entityId: String(categoryId),
          newValues: category.toJSON(),
        },
        req.context
      );

      success(res, 'Category restored successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public moveCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const categoryId = parseInt(req.params.id, 10);
      const { parentId } = req.body;

      const oldCategory = await this.categoryService.getCategory(tenantId, storeId, categoryId);
      const category = await this.categoryService.moveCategory(
        tenantId,
        storeId,
        categoryId,
        parentId,
        userId
      );

      await createAuditLog(
        {
          tenantId,
          action: 'category.move',
          entityType: 'category',
          entityId: String(categoryId),
          previousValues: oldCategory.toJSON(),
          newValues: category.toJSON(),
        },
        req.context
      );

      success(res, 'Category moved successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public reorderCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const { orders } = req.body;

      await this.categoryService.reorderCategories(tenantId, storeId, orders, userId);

      await createAuditLog(
        {
          tenantId,
          action: 'category.reorder',
          entityType: 'category',
          entityId: 'bulk',
          newValues: { orders },
        },
        req.context
      );

      success(res, 'Categories reordered successfully');
    } catch (error) {
      next(error);
    }
  };

  public getCategoryTree = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = this.getStoreId(req);

      const tree = await this.categoryService.getCategoryTree(tenantId, storeId);

      success(res, RESPONSE_MESSAGES.SUCCESS, tree);
    } catch (error) {
      next(error);
    }
  };
}
