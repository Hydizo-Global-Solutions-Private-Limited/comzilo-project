/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { PodStudioService } from '../services/podStudio.service';
import { success, created } from '../shared/responses';

export class PodStudioController {
  private readonly podService = new PodStudioService();

  public getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const templates = await this.podService.listTemplates(tenantId, req.query);
      success(res, 'POD templates retrieved successfully', templates);
    } catch (error) {
      next(error);
    }
  };

  public createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const sellerId = (req.user as any)?.sellerId || null;
      const template = await this.podService.createTemplate(tenantId, sellerId, req.body);
      created(res, 'POD design template created successfully', template);
    } catch (error) {
      next(error);
    }
  };

  public getCliparts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const query = (req.query.q as string) || '';
      const category = (req.query.category as string) || '';
      const cliparts = await this.podService.listCliparts(tenantId, query, category);
      success(res, 'POD cliparts retrieved successfully', cliparts);
    } catch (error) {
      next(error);
    }
  };

  public saveDesign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const userId = (req.user as any)?.id || null;
      const customerId = (req.user as any)?.customerId || null;
      const savedDesign = await this.podService.saveDesign(tenantId, userId, customerId, req.body);
      created(res, 'POD design saved successfully', savedDesign);
    } catch (error) {
      next(error);
    }
  };

  public getSavedDesign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const designId = req.params.id;
      const design = await this.podService.getSavedDesign(tenantId, designId);
      success(res, 'POD saved design retrieved successfully', design);
    } catch (error) {
      next(error);
    }
  };

  public getPackagingModels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const models = await this.podService.listPackagingModels();
      success(res, '3D packaging models retrieved successfully', models);
    } catch (error) {
      next(error);
    }
  };

  public calculatePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = Number(req.body.productId || 1);
      const priceCalculation = await this.podService.calculateCustomizationPrice(productId, req.body);
      success(res, 'POD customization price calculated', priceCalculation);
    } catch (error) {
      next(error);
    }
  };

  public exportPrintPackage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const printPackage = await this.podService.generatePrintPackage(req.body);
      success(res, 'Ready-to-print vector package generated', printPackage);
    } catch (error) {
      next(error);
    }
  };
}
