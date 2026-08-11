/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { BulkVariantService } from '../services/bulkVariant.service';
import { createAuditLog } from '../utils/auditHelper';

const bulkService = new BulkVariantService();

export class BulkVariantController {
  public async searchVariants(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const result = await bulkService.searchVariants(tenantId, storeId, req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async updatePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const result = await bulkService.bulkUpdatePrice(tenantId, storeId, req.body);

      await createAuditLog({
        tenantId,
        userId: (req as any).user?.id || 1,
        action: 'BULK_PRICE_UPDATED',
        entityType: 'ProductVariant',
        entityId: 'batch',
        details: { affectedRecords: result.affectedRecords, payload: req.body },
        req,
      });

      return res.status(200).json({
        success: true,
        message: `Successfully updated prices for ${result.affectedRecords} variants.`,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  public async updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const result = await bulkService.bulkUpdateInventory(tenantId, storeId, req.body);

      await createAuditLog({
        tenantId,
        userId: (req as any).user?.id || 1,
        action: 'BULK_STOCK_UPDATED',
        entityType: 'VariantInventory',
        entityId: 'batch',
        details: { affectedRecords: result.affectedRecords, warehouseId: req.body.warehouseId },
        req,
      });

      return res.status(200).json({
        success: true,
        message: `Successfully updated stock for ${result.affectedRecords} variants.`,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  public async updateSkuBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const result = await bulkService.bulkUpdateSkuBarcode(tenantId, storeId, req.body);

      await createAuditLog({
        tenantId,
        userId: (req as any).user?.id || 1,
        action: 'BULK_SKU_UPDATED',
        entityType: 'ProductVariant',
        entityId: 'batch',
        details: { affectedRecords: result.affectedRecords, action: req.body.action },
        req,
      });

      return res.status(200).json({
        success: true,
        message: `Successfully updated SKU/Barcode for ${result.affectedRecords} variants.`,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  public async importVariants(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const result = await bulkService.importVariants(tenantId, storeId, req.body.rows || []);

      await createAuditLog({
        tenantId,
        userId: (req as any).user?.id || 1,
        action: 'BULK_IMPORT',
        entityType: 'ProductVariant',
        entityId: 'batch',
        details: { successCount: result.successCount, errorCount: result.errorCount },
        req,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const csvData = await bulkService.exportVariantsCSV(tenantId, storeId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=variant-matrix-export.csv');
      return res.status(200).send(csvData);
    } catch (err) {
      return next(err);
    }
  }
}
