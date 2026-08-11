import { Request, Response, NextFunction } from 'express';
import { CommissionEngineService } from '../services/commissionEngine.service';
import { success, created } from '../shared/responses';

export class CommissionEngineController {
  private service = new CommissionEngineService();

  public getCommissionConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const config = await this.service.getCommissionConfig(tenantId);
      success(res, 'Commission settings retrieved successfully', config);
    } catch (err) {
      next(err);
    }
  };

  public updateCommissionConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const updated = await this.service.updateCommissionConfig(tenantId, req.body);
      success(res, 'Commission settings updated successfully', updated);
    } catch (err) {
      next(err);
    }
  };

  public calculatePayout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const { orderId, orderTotal, subtotal } = req.body;
      const breakdown = await this.service.calculateOrderPayout(
        tenantId,
        Number(orderId || 0),
        Number(orderTotal || 100),
        subtotal ? Number(subtotal) : undefined
      );
      success(res, 'Order payout calculation completed', breakdown);
    } catch (err) {
      next(err);
    }
  };

  public getOrderCommissionBreakdown = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || 1;
      const orderId = Number(req.params.orderId);
      const breakdown = await this.service.getOrderCommission(tenantId, orderId);
      success(res, 'Order commission breakdown retrieved', breakdown);
    } catch (err) {
      next(err);
    }
  };

  public getCommissionReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || undefined;
      const report = await this.service.getCommissionReport(tenantId);
      success(res, 'Commission financial report generated', report);
    } catch (err) {
      next(err);
    }
  };
}
