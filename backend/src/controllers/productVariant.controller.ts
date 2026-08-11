import { Request, Response, NextFunction } from 'express';
import { ProductVariantService } from '../services/productVariant.service';
import { success } from '../shared/responses';

const variantService = new ProductVariantService();

export class ProductVariantController {
  public getVariantsByProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = Number(req.params.productId);
      const tenantId = (req as any).tenantId || null;
      const variants = await variantService.getProductVariants(productId, tenantId);
      success(res, 'Product variants retrieved successfully', variants);
    } catch (error) {
      next(error);
    }
  };

  public getVariantById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      const variant = await variantService.getVariantById(id, tenantId);
      success(res, 'Variant retrieved successfully', variant);
    } catch (error) {
      next(error);
    }
  };

  public createVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const variant = await variantService.createVariant(tenantId, req.body);
      success(res, 'Product variant created successfully', variant, 201);
    } catch (error) {
      next(error);
    }
  };

  public updateVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      const updated = await variantService.updateVariant(id, tenantId, req.body);
      success(res, 'Product variant updated successfully', updated);
    } catch (error) {
      next(error);
    }
  };

  public deleteVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      await variantService.deleteVariant(id, tenantId);
      success(res, 'Product variant deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}
