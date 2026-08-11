import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { success } from '../shared/responses';
import { ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';
import { createActivityLog } from '../utils/activityHelper';

export class ReportController {
  private reportService = new ReportService();

  private getStoreId(req: Request): number | null {
    const raw =
      req.headers['x-store-id'] || req.query.storeId || req.body.storeId || req.context?.storeId;
    if (raw && !isNaN(Number(raw))) {
      return Number(raw);
    }
    return req.context?.storeId || null;
  }

  public getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getDashboardSummary(tenantId, storeId);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'DASHBOARD_VIEWED',
          entityType: 'Report',
          entityId: 'dashboard',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      await createActivityLog(
        {
          tenantId,
          userId,
          activityType: 'DASHBOARD_VIEWED',
          description: 'Viewed Executive Dashboard',
        },
        req.context
      );

      success(res, 'Dashboard summary retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public getSalesReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getSalesReport(tenantId, storeId, req.query);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_VIEWED',
          entityType: 'Report',
          entityId: 'sales',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      success(res, 'Sales report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public getProductReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getProductReport(tenantId, storeId, req.query);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_VIEWED',
          entityType: 'Report',
          entityId: 'products',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      success(res, 'Product report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public getInventoryReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getInventoryReport(tenantId, storeId, req.query);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_VIEWED',
          entityType: 'Report',
          entityId: 'inventory',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      success(res, 'Inventory report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public getCustomerReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getCustomerReport(tenantId, storeId);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_VIEWED',
          entityType: 'Report',
          entityId: 'customers',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      success(res, 'Customer report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public getPaymentReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getPaymentReport(tenantId, storeId);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_VIEWED',
          entityType: 'Report',
          entityId: 'payments',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      success(res, 'Payment report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public getPOSReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;

      const data = await this.reportService.getPOSReport(tenantId, storeId);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_VIEWED',
          entityType: 'Report',
          entityId: 'pos',
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      success(res, 'POS report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public exportCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const userId = req.context!.authenticatedUserId!;
      const { reportType } = req.query;

      let rows: Record<string, unknown>[] = [];
      if (reportType === 'sales') {
        const result = await this.reportService.getSalesReport(tenantId, storeId, req.query);
        rows = result.rows;
      } else if (reportType === 'products') {
        const result = await this.reportService.getProductReport(tenantId, storeId, req.query);
        rows = result.rows;
      } else if (reportType === 'inventory') {
        const result = await this.reportService.getInventoryReport(tenantId, storeId, req.query);
        rows = result.items;
      } else if (reportType === 'customers') {
        const result = await this.reportService.getCustomerReport(tenantId, storeId);
        rows = result.topCustomers;
      } else if (reportType === 'payments') {
        const result = await this.reportService.getPaymentReport(tenantId, storeId);
        rows = result.methodBreakdown;
      } else if (reportType === 'pos') {
        const result = await this.reportService.getPOSReport(tenantId, storeId);
        rows = result.registerSales;
      }

      const csvContent = this.reportService.generateCSV(rows);

      await createAuditLog(
        {
          tenantId,
          actorId: userId,
          action: 'REPORT_EXPORTED',
          entityType: 'Report',
          entityId: String(reportType),
          previousValues: null,
          newValues: null,
        },
        req.context
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  };

  public getMarketingReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const data = await this.reportService.getMarketingReport(tenantId, storeId);
      success(res, 'Marketing report retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  public scheduleReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context!.tenantId!;
      const storeId = this.getStoreId(req);
      const data = await this.reportService.scheduleReport(tenantId, storeId, req.body);
      success(res, 'Report delivery scheduled successfully', data);
    } catch (error) {
      next(error);
    }
  };
}
