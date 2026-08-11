import { Request, Response, NextFunction } from 'express';
import { VariantInventoryService } from '../services/variantInventory.service';
import { success } from '../shared/responses';

const service = new VariantInventoryService();

export class VariantInventoryController {
  public getVariantInventories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const variantId = Number(req.params.variantId);
      const tenantId = (req as any).tenantId || null;
      const inventories = await service.getVariantInventories(variantId, tenantId);
      success(res, 'Variant inventories retrieved successfully', inventories);
    } catch (error) {
      next(error);
    }
  };

  public allocateWarehouse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const storeId = (req as any).storeId || null;
      const inventory = await service.allocateWarehouse(
        tenantId,
        storeId,
        req.body,
        (req as any).context
      );
      success(res, 'Warehouse allocated successfully', inventory, 201);
    } catch (error) {
      next(error);
    }
  };

  public adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const updated = await service.adjustStock(tenantId, req.body, (req as any).context);
      success(res, 'Variant stock adjusted successfully', updated);
    } catch (error) {
      next(error);
    }
  };

  public transferStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      await service.transferStock(tenantId, req.body, (req as any).context);
      success(res, 'Variant stock transferred successfully');
    } catch (error) {
      next(error);
    }
  };

  public bulkUpdateInventory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      await service.bulkUpdateInventory(tenantId, req.body.updates || [], (req as any).context);
      success(res, 'Bulk variant inventory update completed successfully');
    } catch (error) {
      next(error);
    }
  };
}
