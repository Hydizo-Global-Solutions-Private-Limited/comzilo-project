/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { PodService } from '../services/pod.service';
import { success, created } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';

export class PodController {
  private readonly podService = new PodService();

  // --- CATEGORIES ---

  public getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const categories = await this.podService.listCategories(tenantId);
      success(res, 'POD categories retrieved successfully', categories);
    } catch (error) {
      next(error);
    }
  };

  public getCategoryBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const category = await this.podService.getCategoryBySlug(req.params.slug, tenantId);
      success(res, 'POD category retrieved successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const category = await this.podService.createCategory(tenantId, req.body);
      created(res, 'POD category created successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const category = await this.podService.updateCategory(Number(req.params.id), tenantId, req.body);
      success(res, 'POD category updated successfully', category);
    } catch (error) {
      next(error);
    }
  };

  public deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      await this.podService.deleteCategory(Number(req.params.id), tenantId);
      success(res, 'POD category deleted successfully', { success: true });
    } catch (error) {
      next(error);
    }
  };

  // --- TEMPLATES ---

  public getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const templates = await this.podService.listTemplates(tenantId, req.query);
      success(res, 'POD templates retrieved successfully', templates);
    } catch (error) {
      next(error);
    }
  };

  public getTemplateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const template = await this.podService.getTemplateById(Number(req.params.id), tenantId);
      success(res, 'POD template retrieved successfully', template);
    } catch (error) {
      next(error);
    }
  };

  public createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const sellerId = (req.user as any)?.sellerId || null;
      const template = await this.podService.createTemplate(tenantId, sellerId, req.body);
      created(res, 'POD template created successfully', template);
    } catch (error) {
      next(error);
    }
  };

  public updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const template = await this.podService.updateTemplate(Number(req.params.id), tenantId, req.body);
      success(res, 'POD template updated successfully', template);
    } catch (error) {
      next(error);
    }
  };

  public toggleTemplateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
      const template = await this.podService.toggleTemplateStatus(Number(req.params.id), tenantId, isActive);
      success(res, 'POD template status updated successfully', template);
    } catch (error) {
      next(error);
    }
  };

  public deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      await this.podService.deleteTemplate(Number(req.params.id), tenantId);
      success(res, 'POD template deleted successfully', { success: true });
    } catch (error) {
      next(error);
    }
  };

  // --- CUSTOMIZATIONS ---

  public saveCustomization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const customization = await this.podService.saveCustomization(tenantId, req.body);
      created(res, 'POD Customization saved successfully', customization);
    } catch (error) {
      next(error);
    }
  };

  public getCustomization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const customization = await this.podService.getCustomizationById(Number(req.params.id), tenantId);
      success(res, 'POD Customization retrieved successfully', customization);
    } catch (error) {
      next(error);
    }
  };

  // --- POD ORDERS ---

  public getPodOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const orders = await this.podService.listPodOrders(tenantId, req.query);
      success(res, 'POD Orders retrieved successfully', orders);
    } catch (error) {
      next(error);
    }
  };

  // --- FILE UPLOAD (FOR CUSTOMER DESIGNS & TEMPLATE ARTWORK) ---

  public uploadDesignImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new ValidationError('No image file uploaded or invalid file type. Only image files (PNG, JPG, JPEG, WEBP, SVG) up to 10MB are permitted.');
      }

      const relativePath = `/uploads/products/${req.file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

      success(res, 'Design image uploaded successfully', {
        filename: req.file.filename,
        path: relativePath,
        url: fullUrl,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- PRICING ---

  public calculatePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = Number(req.body.productId || 1);
      const templateId = req.body.templateId ? Number(req.body.templateId) : undefined;
      const pricing = await this.podService.calculatePrice(productId, templateId, req.body);
      success(res, 'POD price calculated successfully', pricing);
    } catch (error) {
      next(error);
    }
  };
}
