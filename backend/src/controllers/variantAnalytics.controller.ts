/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { VariantAnalyticsService } from '../services/variantAnalytics.service';
import { createAuditLog } from '../utils/auditHelper';

const analyticsService = new VariantAnalyticsService();

export class VariantAnalyticsController {
  public async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;

      const metrics = await analyticsService.getDashboardSummary(tenantId, storeId, warehouseId);

      await createAuditLog({
        tenantId,
        userId: (req as any).user?.id || 1,
        action: 'REPORT_GENERATED',
        entityType: 'VariantAnalytics',
        entityId: 'summary',
        details: { reportType: 'summary', warehouseId },
        req,
      });

      return res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      return next(err);
    }
  }

  public async getTopSellers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const records = await analyticsService.getTopSellingVariants(tenantId, storeId, limit);
      return res.status(200).json({ success: true, data: records });
    } catch (err) {
      return next(err);
    }
  }

  public async getInventoryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;

      const records = await analyticsService.getVariantInventoryReport(
        tenantId,
        storeId,
        warehouseId
      );
      return res.status(200).json({ success: true, data: records });
    } catch (err) {
      return next(err);
    }
  }

  public async getAttributePerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;

      const records = await analyticsService.getAttributePerformanceReport(tenantId, storeId);
      return res.status(200).json({ success: true, data: records });
    } catch (err) {
      return next(err);
    }
  }

  public async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId || 1;
      const storeId = (req as any).storeId || 1;
      const reportType = (req.query.type as string) || 'sales';

      const csvData = await analyticsService.generateReportCSV(tenantId, storeId, reportType);

      await createAuditLog({
        tenantId,
        userId: (req as any).user?.id || 1,
        action: 'REPORT_EXPORTED',
        entityType: 'VariantAnalytics',
        entityId: reportType,
        details: { reportType, exportFormat: 'csv' },
        req,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=variant-${reportType}-report.csv`);
      return res.status(200).send(csvData);
    } catch (err) {
      return next(err);
    }
  }
}
