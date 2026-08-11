import { Request, Response, NextFunction } from 'express';
import { AutomaticSettlementService } from '../services/automaticSettlement.service';
import { success, created } from '../shared/responses';

export class AutomaticSettlementController {
  private service = new AutomaticSettlementService();

  public processEligibleSettlements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.body.tenantId || req.context?.tenantId;
      const result = await this.service.processEligibleSettlements(
        tenantId ? Number(tenantId) : undefined
      );
      success(res, 'Batch automated settlement run completed successfully', result);
    } catch (err) {
      next(err);
    }
  };

  public getSettlements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || undefined;
      const settlements = await this.service.getSettlements(tenantId);
      success(res, 'Settlement records retrieved successfully', settlements);
    } catch (err) {
      next(err);
    }
  };

  public getSettlementReports = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.context?.tenantId || undefined;
      const reports = await this.service.getSettlementReports(tenantId);
      success(res, 'Settlement report summary generated', reports);
    } catch (err) {
      next(err);
    }
  };
}
