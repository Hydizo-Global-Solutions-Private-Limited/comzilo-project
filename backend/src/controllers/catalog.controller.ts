/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { CatalogManagementService } from '../services/catalogManagement.service';
import { success, created } from '../shared/responses';

export class CatalogController {
  private service = new CatalogManagementService();

  // Categories
  public getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const storeId = req.context?.storeId || 1;
      const tree = await this.service.getCategoryTree(tenantId, storeId);
      success(res, 'Category tree retrieved successfully', tree);
    } catch (err) {
      next(err);
    }
  };

  public createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const cat = await this.service.createCategory(tenantId, storeId, req.body);
      success(res, 'Category created successfully', cat, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  public updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const id = Number(req.params.id);
      const cat = await this.service.updateCategory(tenantId, id, req.body);
      success(res, 'Category updated successfully', cat);
    } catch (err) {
      next(err);
    }
  };

  public deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const id = Number(req.params.id);
      await this.service.deleteCategory(tenantId, id);
      success(res, 'Category deleted successfully');
    } catch (err) {
      next(err);
    }
  };

  // Brands
  public getBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const brands = await this.service.getBrands(tenantId, req.query);
      success(res, 'Brands retrieved successfully', brands);
    } catch (err) {
      next(err);
    }
  };

  public createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const brand = await this.service.createBrand(tenantId, storeId, req.body);
      success(res, 'Brand created successfully', brand, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Collections
  public getCollections = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const collections = await this.service.getCollections(tenantId, req.query);
      success(res, 'Collections retrieved successfully', collections);
    } catch (err) {
      next(err);
    }
  };

  public createCollection = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const collection = await this.service.createCollection(tenantId, storeId, req.body);
      success(res, 'Collection created successfully', collection, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Attributes
  public getAttributes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const attrs = await this.service.getAttributes(tenantId);
      success(res, 'Attributes retrieved successfully', attrs);
    } catch (err) {
      next(err);
    }
  };

  public createAttribute = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const attr = await this.service.createAttribute(tenantId, storeId, req.body);
      success(res, 'Attribute created successfully', attr, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Tags
  public getTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const tags = await this.service.getTags(tenantId);
      success(res, 'Tags retrieved successfully', tags);
    } catch (err) {
      next(err);
    }
  };

  public createTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const storeId = req.context?.storeId || 1;
      const tag = await this.service.createTag(tenantId, storeId, req.body);
      success(res, 'Tag created successfully', tag, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  // Dynamic Filters Engine
  public getCatalogFilters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.headers.authorization ? req.context?.tenantId || 1 : null;
      const filters = await this.service.getCatalogFilters(tenantId);
      success(res, 'Catalog dynamic filters retrieved successfully', filters);
    } catch (err) {
      next(err);
    }
  };
}
