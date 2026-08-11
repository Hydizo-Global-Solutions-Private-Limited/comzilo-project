import { Request, Response, NextFunction } from 'express';
import { FinancialDashboardService } from '../services/financialDashboard.service';
import { success } from '../shared/responses';

export class FinancialDashboardController {
  private service = new FinancialDashboardService();

  public getFinancialOverview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const overview = await this.service.getFinancialOverview(
        startDate as string,
        endDate as string
      );
      success(res, 'Financial overview metrics retrieved successfully', overview);
    } catch (err) {
      next(err);
    }
  };

  public getGatewayLogs = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const logs = await this.service.getGatewayLogs();
      success(res, 'Payment gateway logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };

  public getWebhookLogs = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const logs = await this.service.getWebhookLogs();
      success(res, 'Webhook event logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };

  public getPayoutLogs = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const logs = await this.service.getPayoutLogs();
      success(res, 'Payout audit logs retrieved successfully', logs);
    } catch (err) {
      next(err);
    }
  };

  public exportFinancialData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const format = (req.query.format as string) || 'csv';
      const overview = await this.service.getFinancialOverview();

      if (format === 'csv' || format === 'excel') {
        const csvRows = [
          'Metric,Value (INR)',
          `Platform Revenue,${overview.platformRevenue}`,
          `Subscription Revenue,${overview.subscriptionRevenue}`,
          `Marketplace GMV,${overview.marketplaceRevenue}`,
          `Pending Settlements,${overview.pendingSettlements}`,
          `Completed Settlements,${overview.completedSettlements}`,
          `Total Refund Amount,${overview.refunds.amount}`,
          `Total Chargeback Amount,${overview.chargebacks.amount}`,
        ];

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="financial_report_${Date.now()}.${format === 'csv' ? 'csv' : 'xls'}"`
        );
        res.send(csvRows.join('\n'));
        return;
      }

      success(res, 'Export data retrieved successfully', overview);
    } catch (err) {
      next(err);
    }
  };
}
